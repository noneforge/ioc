import 'reflect-metadata';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  Container,
  createConfigurableModule,
  createDynamicModule,
  Inject,
  Injectable,
  InjectionToken,
  METADATA,
  Module,
} from '../../../src';

// Test tokens
const TOKEN_A = new InjectionToken<string>('A');
const TOKEN_B = new InjectionToken<number>('B');
const CONFIG_TOKEN = new InjectionToken<Record<string, unknown>>('CONFIG');

// Test services
@Injectable()
class ServiceA {
  getValue() {
    return 'A';
  }
}

@Injectable()
class ServiceB {
  constructor(@Inject(ServiceA) public serviceA: ServiceA) {}
}

describe('@Module decorator', () => {
  // ========== Basic Module ==========

  describe('basic module', () => {
    it('should mark class as module', () => {
      @Module({})
      class TestModule {}

      const isModule = Reflect.getMetadata(METADATA.MODULE, TestModule);
      expect(isModule).toBe(true);
    });

    it('should store empty arrays for unspecified options', () => {
      @Module({})
      class TestModule {}

      const imports = Reflect.getMetadata(METADATA.MODULE_IMPORTS, TestModule);
      const providers = Reflect.getMetadata(METADATA.MODULE_PROVIDERS, TestModule);
      const exports = Reflect.getMetadata(METADATA.MODULE_EXPORTS, TestModule);

      expect(imports).toEqual([]);
      expect(providers).toEqual([]);
      expect(exports).toEqual([]);
    });

    it('should store imports', () => {
      @Module({})
      class OtherModule {}

      @Module({ imports: [OtherModule] })
      class TestModule {}

      const imports = Reflect.getMetadata(METADATA.MODULE_IMPORTS, TestModule);
      expect(imports).toEqual([OtherModule]);
    });

    it('should store providers', () => {
      @Module({
        providers: [ServiceA, { provide: TOKEN_A, useValue: 'test' }],
      })
      class TestModule {}

      const providers = Reflect.getMetadata(METADATA.MODULE_PROVIDERS, TestModule);
      expect(providers).toHaveLength(2);
      expect(providers[0]).toBe(ServiceA);
      expect(providers[1]).toEqual({ provide: TOKEN_A, useValue: 'test' });
    });

    it('should store exports', () => {
      @Module({
        providers: [ServiceA],
        exports: [ServiceA, TOKEN_A],
      })
      class TestModule {}

      const exports = Reflect.getMetadata(METADATA.MODULE_EXPORTS, TestModule);
      expect(exports).toHaveLength(2);
      expect(exports).toContain(ServiceA);
      expect(exports).toContain(TOKEN_A);
    });

    it('should return the original class', () => {
      const originalClass = class TestModule {};
      const decoratedClass = Module({})(originalClass);

      expect(decoratedClass).toBe(originalClass);
    });
  });

  // ========== Module with Container ==========

  describe('module with Container', () => {
    let container: Container;

    beforeEach(() => {
      container = new Container();
    });

    it('should load module providers into container', () => {
      @Module({
        providers: [{ provide: TOKEN_A, useValue: 'module-value' }],
      })
      class TestModule {}

      container.loadModule(TestModule);

      expect(container.get(TOKEN_A)).toBe('module-value');
    });

    it('should load class providers from module', () => {
      @Module({
        providers: [ServiceA],
      })
      class TestModule {}

      container.loadModule(TestModule);

      const instance = container.get(ServiceA);
      expect(instance).toBeInstanceOf(ServiceA);
      expect(instance.getValue()).toBe('A');
    });

    it('should resolve dependencies within module using factory', () => {
      // Define services locally
      class LocalServiceA {
        getValue() {
          return 'local-A';
        }
      }

      class LocalServiceB {
        constructor(public serviceA: LocalServiceA) {}
      }

      const TOKEN_LOCAL_A = new InjectionToken<LocalServiceA>('LOCAL_A');
      const TOKEN_LOCAL_B = new InjectionToken<LocalServiceB>('LOCAL_B');

      @Module({
        providers: [
          { provide: TOKEN_LOCAL_A, useClass: LocalServiceA },
          {
            provide: TOKEN_LOCAL_B,
            useFactory: (a: LocalServiceA) => new LocalServiceB(a),
            inject: [TOKEN_LOCAL_A],
          },
        ],
      })
      class TestModule {}

      container.loadModule(TestModule);

      const serviceB = container.get(TOKEN_LOCAL_B);
      expect(serviceB).toBeInstanceOf(LocalServiceB);
      expect(serviceB.serviceA).toBeInstanceOf(LocalServiceA);
      expect(serviceB.serviceA.getValue()).toBe('local-A');
    });

    it('should load imported modules', () => {
      @Module({
        providers: [{ provide: TOKEN_A, useValue: 'imported' }],
        exports: [TOKEN_A],
      })
      class ImportedModule {}

      @Module({
        imports: [ImportedModule],
      })
      class MainModule {}

      container.loadModule(MainModule);

      expect(container.get(TOKEN_A)).toBe('imported');
    });
  });
});

describe('createDynamicModule()', () => {
  it('should create module with providers', () => {
    const DynamicModule = createDynamicModule({
      module: class DynamicModuleClass {},
      providers: [{ provide: TOKEN_A, useValue: 'dynamic' }],
    });

    const isModule = Reflect.getMetadata(METADATA.MODULE, DynamicModule);
    const providers = Reflect.getMetadata(METADATA.MODULE_PROVIDERS, DynamicModule);

    expect(isModule).toBe(true);
    expect(providers).toHaveLength(1);
    expect(providers[0]).toEqual({ provide: TOKEN_A, useValue: 'dynamic' });
  });

  it('should create module with imports', () => {
    @Module({})
    class ImportedModule {}

    const DynamicModule = createDynamicModule({
      module: class DynamicModuleClass {},
      imports: [ImportedModule],
    });

    const imports = Reflect.getMetadata(METADATA.MODULE_IMPORTS, DynamicModule);
    expect(imports).toEqual([ImportedModule]);
  });

  it('should create module with exports', () => {
    const DynamicModule = createDynamicModule({
      module: class DynamicModuleClass {},
      providers: [ServiceA],
      exports: [ServiceA],
    });

    const exports = Reflect.getMetadata(METADATA.MODULE_EXPORTS, DynamicModule);
    expect(exports).toEqual([ServiceA]);
  });

  it('should use module name', () => {
    class MyDynamicModule {}
    const DynamicModule = createDynamicModule({
      module: MyDynamicModule,
      providers: [],
    });

    expect(DynamicModule.name).toBe('MyDynamicModule');
  });

  it('should use default name for anonymous class', () => {
    // Create a class with empty name
    const anonymousModule = (() => class {})();
    Object.defineProperty(anonymousModule, 'name', { value: '' });

    const DynamicModule = createDynamicModule({
      module: anonymousModule,
      providers: [],
    });

    expect(DynamicModule.name).toBe('DynamicModule');
  });

  it('should work with Container', () => {
    const container = new Container();

    const DynamicModule = createDynamicModule({
      module: class TestDynamicModule {},
      providers: [{ provide: TOKEN_A, useValue: 'dynamic-value' }],
    });

    container.loadModule(DynamicModule);

    expect(container.get(TOKEN_A)).toBe('dynamic-value');
  });
});

describe('createConfigurableModule()', () => {
  interface ModuleConfig {
    apiUrl: string;
    timeout?: number;
  }

  const configurableModule = createConfigurableModule<ModuleConfig>((options) => ({
    providers: [
      { provide: CONFIG_TOKEN, useValue: options },
      { provide: TOKEN_A, useValue: options.apiUrl },
    ],
    exports: [CONFIG_TOKEN, TOKEN_A],
  }));

  // ========== forRoot() ==========

  describe('forRoot()', () => {
    it('should create module with full options', () => {
      const RootModule = configurableModule.forRoot({
        apiUrl: 'https://api.example.com',
        timeout: 5000,
      });

      const isModule = Reflect.getMetadata(METADATA.MODULE, RootModule);
      const providers = Reflect.getMetadata(METADATA.MODULE_PROVIDERS, RootModule);

      expect(isModule).toBe(true);
      expect(providers).toHaveLength(2);
    });

    it('should work with Container', () => {
      const container = new Container();

      const RootModule = configurableModule.forRoot({
        apiUrl: 'https://api.example.com',
        timeout: 5000,
      });

      container.loadModule(RootModule);

      expect(container.get(TOKEN_A)).toBe('https://api.example.com');
      expect(container.get(CONFIG_TOKEN)).toEqual({
        apiUrl: 'https://api.example.com',
        timeout: 5000,
      });
    });

    it('should handle optional config properties', () => {
      const container = new Container();

      const RootModule = configurableModule.forRoot({
        apiUrl: 'https://api.example.com',
        // timeout is optional
      });

      container.loadModule(RootModule);

      const config = container.get(CONFIG_TOKEN) as unknown as ModuleConfig;
      expect(config.apiUrl).toBe('https://api.example.com');
      expect(config.timeout).toBeUndefined();
    });
  });

  // ========== forChild() ==========

  describe('forChild()', () => {
    it('should create module with partial options', () => {
      const ChildModule = configurableModule.forChild({
        apiUrl: 'https://child-api.example.com',
      });

      const isModule = Reflect.getMetadata(METADATA.MODULE, ChildModule);
      expect(isModule).toBe(true);
    });

    it('should work with Container', () => {
      const container = new Container();

      const ChildModule = configurableModule.forChild({
        apiUrl: 'https://child-api.example.com',
      });

      container.loadModule(ChildModule);

      expect(container.get(TOKEN_A)).toBe('https://child-api.example.com');
    });

    it('should allow empty options', () => {
      // This should work even with missing required fields in forChild
      const simpleConfigurable = createConfigurableModule<{ value?: string }>((options) => ({
        providers: [{ provide: TOKEN_B, useValue: options.value?.length ?? 0 }],
      }));

      const container = new Container();
      const ChildModule = simpleConfigurable.forChild({});

      container.loadModule(ChildModule);

      expect(container.get(TOKEN_B)).toBe(0);
    });
  });

  // ========== Complex scenarios ==========

  describe('complex scenarios', () => {
    it('should create different modules for different configs', () => {
      const container1 = new Container();
      const container2 = new Container();

      const Module1 = configurableModule.forRoot({ apiUrl: 'https://api1.example.com' });
      const Module2 = configurableModule.forRoot({ apiUrl: 'https://api2.example.com' });

      container1.loadModule(Module1);
      container2.loadModule(Module2);

      expect(container1.get(TOKEN_A)).toBe('https://api1.example.com');
      expect(container2.get(TOKEN_A)).toBe('https://api2.example.com');
    });

    it('should support factory providers in configurable module', () => {
      interface DbConfig {
        host: string;
        port: number;
      }

      const dbConfigurable = createConfigurableModule<DbConfig>((options) => ({
        providers: [
          { provide: CONFIG_TOKEN, useValue: options },
          {
            provide: TOKEN_A,
            useFactory: () => `${options.host}:${options.port}`,
          },
        ],
      }));

      const container = new Container();
      const DbModule = dbConfigurable.forRoot({ host: 'localhost', port: 5432 });

      container.loadModule(DbModule);

      expect(container.get(TOKEN_A)).toBe('localhost:5432');
    });
  });
});
