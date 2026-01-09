import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GlobalProviderRegistry, Injectable, METADATA } from '../../../src';

describe('@Injectable', () => {
  beforeEach(() => {
    GlobalProviderRegistry.clear();
  });

  afterEach(() => {
    GlobalProviderRegistry.clear();
  });

  describe('Metadata registration', () => {
    it('should mark class as injectable', () => {
      @Injectable({ providedIn: null })
      class TestService {}

      const isInjectable = Reflect.getMetadata(METADATA.INJECTABLE, TestService);

      expect(isInjectable).toBe(true);
    });

    it('should set scope metadata', () => {
      @Injectable({ providedIn: null, scope: 'transient' })
      class TestService {}

      const scope = Reflect.getMetadata(METADATA.SCOPE, TestService);

      expect(scope).toBe('transient');
    });

    it('should default scope to singleton', () => {
      @Injectable({ providedIn: null })
      class TestService {}

      const scope = Reflect.getMetadata(METADATA.SCOPE, TestService);

      expect(scope).toBe('singleton');
    });

    it('should set providedIn metadata', () => {
      @Injectable({ providedIn: 'platform' })
      class TestService {}

      const providedIn = Reflect.getMetadata(METADATA.PROVIDED_IN, TestService);

      expect(providedIn).toBe('platform');
    });

    it('should default providedIn to root', () => {
      @Injectable()
      class TestService {}

      const providedIn = Reflect.getMetadata(METADATA.PROVIDED_IN, TestService);

      expect(providedIn).toBe('root');
    });
  });

  describe('providedIn options', () => {
    describe('providedIn: root', () => {
      it('should register in GlobalProviderRegistry', () => {
        @Injectable({ providedIn: 'root' })
        class RootService {}

        expect(GlobalProviderRegistry.has(RootService)).toBe(true);
      });

      it('should register with correct scope', () => {
        @Injectable({ providedIn: 'root', scope: 'transient' })
        class RootTransientService {}

        const providers = GlobalProviderRegistry.getProviders(RootTransientService);

        expect(providers.length).toBeGreaterThan(0);
        const provider = providers[0];
        expect('scope' in provider && provider.scope).toBe('transient');
      });

      it('should register with tags', () => {
        @Injectable({ providedIn: 'root', tags: ['api', 'service'] })
        class TaggedService {}

        const providers = GlobalProviderRegistry.getProviders(TaggedService);

        expect(providers.length).toBeGreaterThan(0);
        const provider = providers[0];
        expect('tags' in provider && provider.tags).toEqual(['api', 'service']);
      });
    });

    describe('providedIn: null', () => {
      it('should not register in GlobalProviderRegistry', () => {
        @Injectable({ providedIn: null })
        class LocalService {}

        expect(GlobalProviderRegistry.has(LocalService)).toBe(false);
      });

      it('should still mark class as injectable', () => {
        @Injectable({ providedIn: null })
        class LocalService {}

        const isInjectable = Reflect.getMetadata(METADATA.INJECTABLE, LocalService);

        expect(isInjectable).toBe(true);
      });
    });

    describe('providedIn: platform', () => {
      it('should set platform providedIn metadata', () => {
        @Injectable({ providedIn: 'platform' })
        class PlatformService {}

        const providedIn = Reflect.getMetadata(METADATA.PROVIDED_IN, PlatformService);

        expect(providedIn).toBe('platform');
      });
    });

    describe('providedIn: any', () => {
      it('should set any providedIn metadata', () => {
        @Injectable({ providedIn: 'any' })
        class AnyService {}

        const providedIn = Reflect.getMetadata(METADATA.PROVIDED_IN, AnyService);

        expect(providedIn).toBe('any');
      });
    });
  });

  describe('Scope options', () => {
    it('should handle singleton scope', () => {
      @Injectable({ providedIn: null, scope: 'singleton' })
      class SingletonService {}

      const scope = Reflect.getMetadata(METADATA.SCOPE, SingletonService);

      expect(scope).toBe('singleton');
    });

    it('should handle transient scope', () => {
      @Injectable({ providedIn: null, scope: 'transient' })
      class TransientService {}

      const scope = Reflect.getMetadata(METADATA.SCOPE, TransientService);

      expect(scope).toBe('transient');
    });

    it('should handle request scope', () => {
      @Injectable({ providedIn: null, scope: 'request' })
      class RequestService {}

      const scope = Reflect.getMetadata(METADATA.SCOPE, RequestService);

      expect(scope).toBe('request');
    });

    it('should handle prototype scope', () => {
      @Injectable({ providedIn: null, scope: 'prototype' })
      class PrototypeService {}

      const scope = Reflect.getMetadata(METADATA.SCOPE, PrototypeService);

      expect(scope).toBe('prototype');
    });

    it('should handle scoped scope', () => {
      @Injectable({ providedIn: null, scope: 'scoped' })
      class ScopedService {}

      const scope = Reflect.getMetadata(METADATA.SCOPE, ScopedService);

      expect(scope).toBe('scoped');
    });
  });

  describe('Decorator behavior', () => {
    it('should return the class unchanged', () => {
      const original = class TestService {};
      const decorated = Injectable({ providedIn: null })(original);

      expect(decorated).toBe(original);
    });

    it('should work with empty options', () => {
      @Injectable()
      class DefaultService {}

      const isInjectable = Reflect.getMetadata(METADATA.INJECTABLE, DefaultService);

      expect(isInjectable).toBe(true);
    });

    it('should work without options', () => {
      const decorator = Injectable();

      expect(typeof decorator).toBe('function');
    });

    it('should preserve class name', () => {
      @Injectable({ providedIn: null })
      class NamedService {}

      expect(NamedService.name).toBe('NamedService');
    });

    it('should preserve class prototype', () => {
      @Injectable({ providedIn: null })
      class ServiceWithMethod {
        getValue() { return 'value'; }
      }

      const instance = new ServiceWithMethod();

      expect(instance.getValue()).toBe('value');
    });
  });

  describe('Real-world scenarios', () => {
    it('should work with class extending another class', () => {
      class BaseService {
        getBase() { return 'base'; }
      }

      @Injectable({ providedIn: null })
      class ExtendedService extends BaseService {
        getExtended() { return 'extended'; }
      }

      const isInjectable = Reflect.getMetadata(METADATA.INJECTABLE, ExtendedService);
      const instance = new ExtendedService();

      expect(isInjectable).toBe(true);
      expect(instance.getBase()).toBe('base');
      expect(instance.getExtended()).toBe('extended');
    });

    it('should work with class implementing interface', () => {
      interface IService {
        getValue(): string;
      }

      @Injectable({ providedIn: null })
      class ServiceImpl implements IService {
        getValue() { return 'impl'; }
      }

      const isInjectable = Reflect.getMetadata(METADATA.INJECTABLE, ServiceImpl);

      expect(isInjectable).toBe(true);
    });

    it('should work with static members', () => {
      @Injectable({ providedIn: null })
      class ServiceWithStatic {
        static VERSION = '1.0.0';
        getVersion() { return ServiceWithStatic.VERSION; }
      }

      expect(ServiceWithStatic.VERSION).toBe('1.0.0');
      expect(new ServiceWithStatic().getVersion()).toBe('1.0.0');
    });

    it('should work with constructor parameters', () => {
      @Injectable({ providedIn: null })
      class ServiceWithParams {
        constructor(public value: string) {}
      }

      const instance = new ServiceWithParams('test');

      expect(instance.value).toBe('test');
    });
  });
});
