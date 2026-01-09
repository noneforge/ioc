import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CircularDependencyError,
  Container,
  createContainer,
  forwardRef,
  GlobalProviderRegistry,
  Injectable,
  InjectionToken,
  NoProviderError,
  ValidationError,
} from '../../../src';

// Test fixtures - local to avoid GlobalRegistry pollution
class SimpleService {
  getValue() { return 'simple'; }
}

class DependentService {
  constructor(public simple: SimpleService) {}
  getValue() { return `dependent-${this.simple.getValue()}`; }
}

class NestedService {
  constructor(public dependent: DependentService) {}
  getValue() { return `nested-${this.dependent.getValue()}`; }
}

// Tokens
const STRING_TOKEN = new InjectionToken<string>('STRING_TOKEN');
const NUMBER_TOKEN = new InjectionToken<number>('NUMBER_TOKEN');
const CONFIG_TOKEN = new InjectionToken<{ url: string }>('CONFIG_TOKEN');

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    GlobalProviderRegistry.clear();
    container = new Container();
  });

  afterEach(async () => {
    await container.dispose();
  });

  // ========== BASIC RESOLUTION ==========

  describe('Basic Resolution', () => {
    describe('get()', () => {
      it('should resolve class provider', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });

        const instance = container.get(SimpleService);

        expect(instance).toBeInstanceOf(SimpleService);
        expect(instance.getValue()).toBe('simple');
      });

      it('should resolve value provider', () => {
        container.addProvider({ provide: STRING_TOKEN, useValue: 'test-value' });

        const value = container.get(STRING_TOKEN);

        expect(value).toBe('test-value');
      });

      it('should resolve factory provider', () => {
        container.addProvider({
          provide: STRING_TOKEN,
          useFactory: () => 'factory-value',
        });

        const value = container.get(STRING_TOKEN);

        expect(value).toBe('factory-value');
      });

      it('should resolve factory provider with dependencies', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });
        container.addProvider({
          provide: STRING_TOKEN,
          useFactory: (service: SimpleService) => `factory-${service.getValue()}`,
          inject: [SimpleService],
        });

        const value = container.get(STRING_TOKEN);

        expect(value).toBe('factory-simple');
      });

      it('should resolve existing provider (alias)', () => {
        const ALIAS_TOKEN = new InjectionToken<string>('ALIAS');
        container.addProvider({ provide: STRING_TOKEN, useValue: 'original' });
        container.addProvider({ provide: ALIAS_TOKEN, useExisting: STRING_TOKEN });

        const value = container.get(ALIAS_TOKEN);

        expect(value).toBe('original');
      });

      it('should throw NoProviderError for missing provider', () => {
        expect(() => container.get(SimpleService)).toThrow(NoProviderError);
      });

      it('should return null for optional missing provider', () => {
        const value = container.get(SimpleService, { optional: true });

        expect(value).toBeNull();
      });

      it('should return first multi-provider when using get() instead of getAll()', () => {
        container.addProvider({ provide: STRING_TOKEN, useValue: 'first', multi: true });
        container.addProvider({ provide: STRING_TOKEN, useValue: 'second', multi: true });
        container.addProvider({ provide: STRING_TOKEN, useValue: 'third', multi: true });

        const value = container.get(STRING_TOKEN);

        expect(value).toBe('first');
      });
    });

    describe('getAsync()', () => {
      it('should resolve async provider', async () => {
        container.addProvider({
          provide: STRING_TOKEN,
          useAsync: async () => 'async-value',
        });

        const value = await container.getAsync(STRING_TOKEN);

        expect(value).toBe('async-value');
      });

      it('should resolve class provider asynchronously', async () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });

        const instance = await container.getAsync(SimpleService);

        expect(instance).toBeInstanceOf(SimpleService);
      });

      it('should handle async factory with delay', async () => {
        container.addProvider({
          provide: STRING_TOKEN,
          useAsync: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));

            return 'delayed-value';
          },
        });

        const value = await container.getAsync(STRING_TOKEN);

        expect(value).toBe('delayed-value');
      });
    });

    describe('getAll()', () => {
      it('should return all multi-providers', () => {
        container.addProvider({ provide: STRING_TOKEN, useValue: 'value1', multi: true });
        container.addProvider({ provide: STRING_TOKEN, useValue: 'value2', multi: true });
        container.addProvider({ provide: STRING_TOKEN, useValue: 'value3', multi: true });

        const values = container.getAll(STRING_TOKEN);

        expect(values).toHaveLength(3);
        expect(values).toContain('value1');
        expect(values).toContain('value2');
        expect(values).toContain('value3');
      });

      it('should return empty array for no multi-providers', () => {
        container.addProvider({ provide: STRING_TOKEN, useValue: 'single' });

        const values = container.getAll(STRING_TOKEN);

        expect(values).toHaveLength(0);
      });
    });

    describe('has() and hasProvider()', () => {
      it('should return true for registered provider', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });

        expect(container.has(SimpleService)).toBe(true);
        expect(container.hasProvider(SimpleService)).toBe(true);
      });

      it('should return false for missing provider', () => {
        expect(container.has(SimpleService)).toBe(false);
        expect(container.hasProvider(SimpleService)).toBe(false);
      });
    });
  });

  // ========== PROVIDER TYPES ==========

  describe('Provider Types', () => {
    it('should handle constructor provider (direct class)', () => {
      @Injectable({ providedIn: null })
      class LocalService {
        getValue() { return 'local'; }
      }

      container.addProvider(LocalService);

      const instance = container.get(LocalService);

      expect(instance).toBeInstanceOf(LocalService);
    });

    it('should handle ClassProvider with useClass', () => {
      abstract class AbstractService {
        abstract getValue(): string;
      }

      class ConcreteService extends AbstractService {
        getValue() { return 'concrete'; }
      }

      container.addProvider({ provide: AbstractService, useClass: ConcreteService });

      const instance = container.get(AbstractService);

      expect(instance).toBeInstanceOf(ConcreteService);
      expect(instance.getValue()).toBe('concrete');
    });

    it('should handle ValueProvider with useValue', () => {
      const config = { url: 'http://api.example.com', timeout: 5000 };
      container.addProvider({ provide: CONFIG_TOKEN, useValue: config });

      const value = container.get(CONFIG_TOKEN);

      expect(value).toBe(config);
      expect(value.url).toBe('http://api.example.com');
    });

    it('should handle FactoryProvider with useFactory', () => {
      container.addProvider({ provide: NUMBER_TOKEN, useValue: 10 });
      container.addProvider({
        provide: STRING_TOKEN,
        useFactory: (num: number) => `number-${num}`,
        inject: [NUMBER_TOKEN],
      });

      const value = container.get(STRING_TOKEN);

      expect(value).toBe('number-10');
    });

    it('should handle ExistingProvider with useExisting', () => {
      const PRIMARY = new InjectionToken<string>('PRIMARY');
      const ALIAS = new InjectionToken<string>('ALIAS');

      container.addProvider({ provide: PRIMARY, useValue: 'primary-value' });
      container.addProvider({ provide: ALIAS, useExisting: PRIMARY });

      expect(container.get(ALIAS)).toBe('primary-value');
      expect(container.get(PRIMARY)).toBe(container.get(ALIAS));
    });

    it('should handle AsyncProvider with useAsync', async () => {
      container.addProvider({
        provide: CONFIG_TOKEN,
        useAsync: async () => ({ url: 'https://async.api.com' }),
      });

      const config = await container.getAsync(CONFIG_TOKEN);

      expect(config.url).toBe('https://async.api.com');
    });

    it('should throw when using sync get() with async provider', () => {
      container.addProvider({
        provide: STRING_TOKEN,
        useAsync: async () => 'async',
      });

      expect(() => container.get(STRING_TOKEN)).toThrow('Async providers require getAsync() method');
    });
  });

  // ========== SCOPES ==========

  describe('Scopes', () => {
    describe('singleton scope', () => {
      it('should return same instance every time', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService, scope: 'singleton' });

        const instance1 = container.get(SimpleService);
        const instance2 = container.get(SimpleService);

        expect(instance1).toBe(instance2);
      });

      it('should be default scope', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });

        const instance1 = container.get(SimpleService);
        const instance2 = container.get(SimpleService);

        expect(instance1).toBe(instance2);
      });
    });

    describe('transient scope', () => {
      it('should return new instance every time', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService, scope: 'transient' });

        const instance1 = container.get(SimpleService);
        const instance2 = container.get(SimpleService);

        expect(instance1).not.toBe(instance2);
        expect(instance1).toBeInstanceOf(SimpleService);
        expect(instance2).toBeInstanceOf(SimpleService);
      });
    });

    describe('request scope', () => {
      it('should return same instance for same requestId', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService, scope: 'request' });

        const requestId = Symbol('request-1');
        const instance1 = container.get(SimpleService, { requestId });
        const instance2 = container.get(SimpleService, { requestId });

        expect(instance1).toBe(instance2);
      });

      it('should return different instance for different requestId', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService, scope: 'request' });

        const instance1 = container.get(SimpleService, { requestId: 'req-1' });
        const instance2 = container.get(SimpleService, { requestId: 'req-2' });

        expect(instance1).not.toBe(instance2);
      });
    });
  });

  // ========== RESOLUTION OPTIONS ==========

  describe('Resolution Options', () => {
    describe('optional', () => {
      it('should return null when provider not found', () => {
        const result = container.get(SimpleService, { optional: true });

        expect(result).toBeNull();
      });

      it('should return instance when provider exists', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });

        const result = container.get(SimpleService, { optional: true });

        expect(result).toBeInstanceOf(SimpleService);
      });
    });

    describe('lazy', () => {
      it('should return lazy proxy', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });

        const proxy = container.get(SimpleService, { lazy: true });

        expect(proxy).toBeDefined();
        expect(typeof proxy).toBe('object');
      });

      it('should resolve lazily on property access', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });

        const proxy = container.get(SimpleService, { lazy: true });
        const value = (proxy).getValue();

        expect(value).toBe('simple');
      });
    });

    describe('skipSelf', () => {
      it('should resolve from parent container', () => {
        const parent = new Container([{ provide: STRING_TOKEN, useValue: 'parent' }]);
        const child = parent.createChild([{ provide: STRING_TOKEN, useValue: 'child' }]);

        const result = child.get(STRING_TOKEN, { skipSelf: true });

        expect(result).toBe('parent');
      });
    });

    describe('self', () => {
      it('should only resolve from current container', () => {
        const parent = new Container([{ provide: STRING_TOKEN, useValue: 'parent' }]);
        const child = parent.createChild();

        expect(() => child.get(STRING_TOKEN, { self: true })).toThrow(NoProviderError);
      });

      it('should resolve from current container if present', () => {
        const parent = new Container([{ provide: STRING_TOKEN, useValue: 'parent' }]);
        const child = parent.createChild([{ provide: STRING_TOKEN, useValue: 'child' }]);

        const result = child.get(STRING_TOKEN, { self: true });

        expect(result).toBe('child');
      });
    });
  });

  // ========== DEPENDENCY INJECTION ==========

  describe('Dependency Injection', () => {
    it('should resolve constructor dependencies via factory', () => {
      // Use factory provider to test dependency resolution without metadata
      container.addProvider({ provide: SimpleService, useClass: SimpleService });
      container.addProvider({
        provide: DependentService,
        useFactory: (simple: SimpleService) => new DependentService(simple),
        inject: [SimpleService],
      });

      const instance = container.get(DependentService);

      expect(instance.getValue()).toBe('dependent-simple');
    });

    it('should resolve nested dependencies via factory', () => {
      container.addProvider({ provide: SimpleService, useClass: SimpleService });
      container.addProvider({
        provide: DependentService,
        useFactory: (simple: SimpleService) => new DependentService(simple),
        inject: [SimpleService],
      });
      container.addProvider({
        provide: NestedService,
        useFactory: (dep: DependentService) => new NestedService(dep),
        inject: [DependentService],
      });

      const instance = container.get(NestedService);

      expect(instance.getValue()).toBe('nested-dependent-simple');
    });

    it('should detect circular dependencies', () => {
      class CircularA {
        constructor(public b: CircularB) {}
      }

      class CircularB {
        constructor(public a: CircularA) {}
      }

      container.addProvider({ provide: CircularA, useClass: CircularA });
      container.addProvider({ provide: CircularB, useClass: CircularB });

      Reflect.defineMetadata('design:paramtypes', [CircularB], CircularA);
      Reflect.defineMetadata('design:paramtypes', [CircularA], CircularB);

      expect(() => container.get(CircularA)).toThrow(CircularDependencyError);
    });

    it('should handle @Inject decorator on constructor param', () => {
      const TOKEN = new InjectionToken<string>('INJECTED');

      class ServiceWithInject {
        constructor(public value: string) {}
      }

      // Manually set metadata as decorator would
      Reflect.defineMetadata('design:paramtypes', [String], ServiceWithInject);
      const injectTokens: unknown[] = [];
      injectTokens[0] = TOKEN;
      Reflect.defineMetadata('di:inject-tokens', injectTokens, ServiceWithInject);

      container.addProvider({ provide: TOKEN, useValue: 'injected-value' });
      container.addProvider({ provide: ServiceWithInject, useClass: ServiceWithInject });

      const instance = container.get(ServiceWithInject);

      expect(instance.value).toBe('injected-value');
    });

    it('should handle @Optional decorator', () => {
      class ServiceWithOptional {
        constructor(public optional?: SimpleService) {}
      }

      // Set metadata manually
      Reflect.defineMetadata('design:paramtypes', [SimpleService], ServiceWithOptional);
      const optionalTokens: boolean[] = [];
      optionalTokens[0] = true;
      Reflect.defineMetadata('di:optional-tokens', optionalTokens, ServiceWithOptional);

      container.addProvider({ provide: ServiceWithOptional, useClass: ServiceWithOptional });

      const instance = container.get(ServiceWithOptional);

      expect(instance.optional).toBeNull();
    });
  });

  // ========== CONTAINER HIERARCHY ==========

  describe('Container Hierarchy', () => {
    it('should create child container', () => {
      const child = container.createChild();

      expect(child).toBeInstanceOf(Container);
    });

    it('should inherit providers from parent', () => {
      container.addProvider({ provide: STRING_TOKEN, useValue: 'parent-value' });

      const child = container.createChild();
      const value = child.get(STRING_TOKEN);

      expect(value).toBe('parent-value');
    });

    it('should override parent providers', () => {
      container.addProvider({ provide: STRING_TOKEN, useValue: 'parent' });

      const child = container.createChild([
        { provide: STRING_TOKEN, useValue: 'child' },
      ]);

      expect(container.get(STRING_TOKEN)).toBe('parent');
      expect(child.get(STRING_TOKEN)).toBe('child');
    });

    it('should resolve dependencies across hierarchy', () => {
      container.addProvider({ provide: SimpleService, useClass: SimpleService });

      const child = container.createChild([
        { provide: DependentService, useClass: DependentService },
      ]);

      Reflect.defineMetadata('design:paramtypes', [SimpleService], DependentService);

      const instance = child.get(DependentService);

      expect(instance.getValue()).toBe('dependent-simple');
    });
  });

  // ========== LIFECYCLE ==========

  describe('Lifecycle', () => {
    it('should call onInit hook', () => {
      const onInitSpy = vi.fn();

      class ServiceWithInit {
        onInit() {
          onInitSpy();
        }
      }

      container.addProvider({ provide: ServiceWithInit, useClass: ServiceWithInit });

      container.get(ServiceWithInit);

      expect(onInitSpy).toHaveBeenCalledOnce();
    });

    it('should call async onInit hook', async () => {
      const onInitSpy = vi.fn();

      class ServiceWithAsyncInit {
        async onInit() {
          await new Promise((resolve) => setTimeout(resolve, 10));
          onInitSpy();
        }
      }

      container.addProvider({ provide: ServiceWithAsyncInit, useClass: ServiceWithAsyncInit });

      await container.getAsync(ServiceWithAsyncInit);

      expect(onInitSpy).toHaveBeenCalledOnce();
    });

    it('should call onDestroy hook on dispose', async () => {
      const onDestroySpy = vi.fn();

      class ServiceWithDestroy {
        onDestroy() {
          onDestroySpy();
        }
      }

      container.addProvider({ provide: ServiceWithDestroy, useClass: ServiceWithDestroy });
      container.get(ServiceWithDestroy);

      await container.dispose();

      expect(onDestroySpy).toHaveBeenCalledOnce();
    });

    it('should dispose all singletons', async () => {
      const destroySpy1 = vi.fn();
      const destroySpy2 = vi.fn();

      class Service1 { onDestroy() { destroySpy1(); } }
      class Service2 { onDestroy() { destroySpy2(); } }

      container.addProvider({ provide: Service1, useClass: Service1 });
      container.addProvider({ provide: Service2, useClass: Service2 });

      container.get(Service1);
      container.get(Service2);

      await container.dispose();

      expect(destroySpy1).toHaveBeenCalledOnce();
      expect(destroySpy2).toHaveBeenCalledOnce();
    });
  });

  // ========== VALIDATION ==========

  describe('Validation', () => {
    it('should validate provider on add', () => {
      expect(() => {
        container.addProvider({ provide: STRING_TOKEN } as any);
      }).toThrow(ValidationError);
    });

    it('should reject provider with multiple use* properties', () => {
      expect(() => {
        container.addProvider({
          provide: STRING_TOKEN,
          useValue: 'value',
          useFactory: () => 'factory',
        } as any);
      }).toThrow(ValidationError);
    });

    it('should reject invalid useFactory', () => {
      expect(() => {
        container.addProvider({
          provide: STRING_TOKEN,
          useFactory: 'not-a-function',
        } as any);
      }).toThrow(ValidationError);
    });

    it('should reject invalid useAsync', () => {
      expect(() => {
        container.addProvider({
          provide: STRING_TOKEN,
          useAsync: 'not-a-function',
        } as any);
      }).toThrow(ValidationError);
    });

    it('should reject invalid useClass', () => {
      expect(() => {
        container.addProvider({
          provide: STRING_TOKEN,
          useClass: 'not-a-constructor',
        } as any);
      }).toThrow(ValidationError);
    });

    describe('validate()', () => {
      it('should return valid for correct configuration', () => {
        container.addProvider({ provide: SimpleService, useClass: SimpleService });

        const result = container.validate();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  // ========== STATISTICS ==========

  describe('Statistics', () => {
    it('should track resolutions', () => {
      container.addProvider({ provide: SimpleService, useClass: SimpleService });

      container.get(SimpleService);
      container.get(SimpleService);

      const stats = container.getStatistics();

      expect(stats.resolutions).toBe(2);
    });

    it('should track cache hits', () => {
      container.addProvider({ provide: SimpleService, useClass: SimpleService, scope: 'singleton' });

      container.get(SimpleService);
      container.get(SimpleService);

      const stats = container.getStatistics();

      expect(stats.cacheHits).toBe(1);
      expect(stats.creates).toBe(1);
    });

    it('should track errors', () => {
      try {
        container.get(SimpleService);
      } catch {
        // Expected
      }

      const stats = container.getStatistics();

      expect(stats.errors).toBe(1);
    });
  });

  // ========== FORWARD REF ==========

  describe('ForwardRef', () => {
    it('should resolve forward reference in useClass', () => {
      class LazyService {
        getValue() { return 'lazy'; }
      }

      container.addProvider({
        provide: SimpleService,
        useClass: forwardRef(() => LazyService),
      });

      const instance = container.get(SimpleService);

      expect(instance).toBeInstanceOf(LazyService);
    });

    it('should resolve forward reference in useExisting', () => {
      const TARGET = new InjectionToken<string>('TARGET');
      const ALIAS = new InjectionToken<string>('ALIAS');

      container.addProvider({ provide: TARGET, useValue: 'target-value' });
      container.addProvider({
        provide: ALIAS,
        useExisting: forwardRef(() => TARGET),
      });

      const value = container.get(ALIAS);

      expect(value).toBe('target-value');
    });
  });

  // ========== DEFAULT METADATA ==========

  describe('defaultMetadata', () => {
    it('should pass defaultMetadata to injection context', () => {
      let capturedEnv: unknown;

      const container = new Container(
        [
          {
            provide: STRING_TOKEN,
            useFactory: () => 'value',
            when: (ctx) => {
              capturedEnv = ctx.metadata.get('environment');

              return true;
            },
          },
        ],
        undefined,
        { defaultMetadata: { environment: 'production' } },
      );

      container.get(STRING_TOKEN);

      expect(capturedEnv).toBe('production');
    });

    it('should allow per-call metadata to override defaultMetadata', () => {
      let capturedEnv: unknown;

      const container = new Container(
        [
          {
            provide: STRING_TOKEN,
            useFactory: () => 'value',
            when: (ctx) => {
              capturedEnv = ctx.metadata.get('environment');

              return true;
            },
          },
        ],
        undefined,
        { defaultMetadata: { environment: 'production' } },
      );

      container.get(STRING_TOKEN, { metadata: { environment: 'test' } });

      expect(capturedEnv).toBe('test');
    });

    it('should merge defaultMetadata with per-call metadata', () => {
      let capturedMetadata: { get(key: string): unknown } | undefined;

      const container = new Container(
        [
          {
            provide: STRING_TOKEN,
            useFactory: () => 'value',
            when: (ctx) => {
              capturedMetadata = ctx.metadata;

              return true;
            },
          },
        ],
        undefined,
        { defaultMetadata: { env: 'prod', version: '1.0' } },
      );

      container.get(STRING_TOKEN, { metadata: { requestId: '123' } });

      expect(capturedMetadata?.get('env')).toBe('prod');
      expect(capturedMetadata?.get('version')).toBe('1.0');
      expect(capturedMetadata?.get('requestId')).toBe('123');
    });

    it('should work with conditional providers', () => {
      const container = new Container(
        [
          {
            provide: STRING_TOKEN,
            useValue: 'dev-value',
            when: (ctx) => ctx.metadata.get('environment') === 'development',
          },
          {
            provide: STRING_TOKEN,
            useValue: 'prod-value',
            when: (ctx) => ctx.metadata.get('environment') === 'production',
          },
        ],
        undefined,
        { defaultMetadata: { environment: 'production' } },
      );

      const value = container.get(STRING_TOKEN);

      expect(value).toBe('prod-value');
    });

    it('should work with async resolution', async () => {
      let capturedEnv: unknown;

      const container = new Container(
        [
          {
            provide: STRING_TOKEN,
            useAsync: async () => 'async-value',
            when: (ctx) => {
              capturedEnv = ctx.metadata.get('environment');

              return true;
            },
          },
        ],
        undefined,
        { defaultMetadata: { environment: 'staging' } },
      );

      await container.getAsync(STRING_TOKEN);

      expect(capturedEnv).toBe('staging');
    });
  });

  // ========== createContainer HELPER ==========

  describe('createContainer()', () => {
    it('should create container with providers', () => {
      const newContainer = createContainer(
        { provide: STRING_TOKEN, useValue: 'hello' },
        { provide: NUMBER_TOKEN, useValue: 42 },
      );

      expect(newContainer.get(STRING_TOKEN)).toBe('hello');
      expect(newContainer.get(NUMBER_TOKEN)).toBe(42);

      newContainer.dispose();
    });

    it('should create empty container', () => {
      const newContainer = createContainer();

      expect(newContainer).toBeInstanceOf(Container);

      newContainer.dispose();
    });
  });
});
