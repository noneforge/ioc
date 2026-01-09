import { describe, expect, it, vi } from 'vitest';

import {
  hasLifecycleHook,
  hasOnDestroy,
  hasOnInit,
  hasOnInject,
  hasOnRequest,
  isDisposable,
} from '../../../src';

describe('type-guards', () => {
  describe('hasLifecycleHook', () => {
    it('should return true when object has the specified hook as function', () => {
      const obj = { testHook: vi.fn() };
      expect(hasLifecycleHook(obj, 'testHook')).toBe(true);
    });

    it('should return false when object does not have the hook', () => {
      const obj = {};
      expect(hasLifecycleHook(obj, 'testHook')).toBe(false);
    });

    it('should return false when hook exists but is not a function', () => {
      const obj = { testHook: 'not a function' };
      expect(hasLifecycleHook(obj, 'testHook')).toBe(false);
    });

    it('should return false when hook is null', () => {
      const obj = { testHook: null };
      expect(hasLifecycleHook(obj, 'testHook')).toBe(false);
    });

    it('should return false when hook is undefined', () => {
      const obj = { testHook: undefined };
      expect(hasLifecycleHook(obj, 'testHook')).toBe(false);
    });

    it('should return false for null object', () => {
      expect(hasLifecycleHook<{ testHook: () => void }>(null, 'testHook')).toBeFalsy();
    });

    it('should return false for undefined object', () => {
      expect(hasLifecycleHook<{ testHook: () => void }>(undefined, 'testHook')).toBeFalsy();
    });

    it('should work with arrow functions', () => {
      const obj = { testHook: () => {} };
      expect(hasLifecycleHook(obj, 'testHook')).toBe(true);
    });

    it('should work with async functions', () => {
      const obj = { testHook: async () => {} };
      expect(hasLifecycleHook(obj, 'testHook')).toBe(true);
    });
  });

  describe('hasOnInit', () => {
    it('should return true for objects with onInit function', () => {
      const obj = { onInit: vi.fn() };
      expect(hasOnInit(obj)).toBe(true);
    });

    it('should return true for objects with async onInit', () => {
      const obj = { onInit: vi.fn().mockResolvedValue(undefined) };
      expect(hasOnInit(obj)).toBe(true);
    });

    it('should return false for objects without onInit', () => {
      const obj = {};
      expect(hasOnInit(obj)).toBe(false);
    });

    it('should return false when onInit is not a function', () => {
      const obj = { onInit: 'not a function' };
      expect(hasOnInit(obj)).toBe(false);
    });

    it('should work with class instances', () => {
      class TestClass {
        onInit() {}
      }
      const instance = new TestClass();
      expect(hasOnInit(instance)).toBe(true);
    });

    it('should return false for primitives', () => {
      expect(hasOnInit('string')).toBe(false);
      expect(hasOnInit(123)).toBe(false);
      expect(hasOnInit(true)).toBe(false);
    });
  });

  describe('hasOnDestroy', () => {
    it('should return true for objects with onDestroy function', () => {
      const obj = { onDestroy: vi.fn() };
      expect(hasOnDestroy(obj)).toBe(true);
    });

    it('should return true for objects with async onDestroy', () => {
      const obj = { onDestroy: vi.fn().mockResolvedValue(undefined) };
      expect(hasOnDestroy(obj)).toBe(true);
    });

    it('should return false for objects without onDestroy', () => {
      const obj = {};
      expect(hasOnDestroy(obj)).toBe(false);
    });

    it('should return false when onDestroy is not a function', () => {
      const obj = { onDestroy: 'not a function' };
      expect(hasOnDestroy(obj)).toBe(false);
    });

    it('should work with class instances', () => {
      class TestClass {
        onDestroy() {}
      }
      const instance = new TestClass();
      expect(hasOnDestroy(instance)).toBe(true);
    });
  });

  describe('hasOnInject', () => {
    it('should return true for objects with onInject function', () => {
      const obj = { onInject: vi.fn() };
      expect(hasOnInject(obj)).toBe(true);
    });

    it('should return false for objects without onInject', () => {
      const obj = {};
      expect(hasOnInject(obj)).toBe(false);
    });

    it('should return false when onInject is not a function', () => {
      const obj = { onInject: 'not a function' };
      expect(hasOnInject(obj)).toBe(false);
    });

    it('should work with class instances', () => {
      class TestClass {
        onInject() {}
      }
      const instance = new TestClass();
      expect(hasOnInject(instance)).toBe(true);
    });
  });

  describe('hasOnRequest', () => {
    it('should return true for objects with onRequest function', () => {
      const obj = { onRequest: vi.fn() };
      expect(hasOnRequest(obj)).toBe(true);
    });

    it('should return false for objects without onRequest', () => {
      const obj = {};
      expect(hasOnRequest(obj)).toBe(false);
    });

    it('should return false when onRequest is not a function', () => {
      const obj = { onRequest: 'not a function' };
      expect(hasOnRequest(obj)).toBe(false);
    });

    it('should work with class instances', () => {
      class TestClass {
        onRequest() {}
      }
      const instance = new TestClass();
      expect(hasOnRequest(instance)).toBe(true);
    });
  });

  describe('isDisposable', () => {
    it('should return true for objects with dispose function', () => {
      const obj = { dispose: vi.fn() };
      expect(isDisposable(obj)).toBe(true);
    });

    it('should return true for objects with async dispose', () => {
      const obj = { dispose: vi.fn().mockResolvedValue(undefined) };
      expect(isDisposable(obj)).toBe(true);
    });

    it('should return false for objects without dispose', () => {
      const obj = {};
      expect(isDisposable(obj)).toBe(false);
    });

    it('should return false when dispose is not a function', () => {
      const obj = { dispose: 'not a function' };
      expect(isDisposable(obj)).toBe(false);
    });

    it('should work with class instances', () => {
      class TestClass {
        dispose() {}
      }
      const instance = new TestClass();
      expect(isDisposable(instance)).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should handle objects with multiple lifecycle hooks', () => {
      const obj = {
        onInit: vi.fn(),
        onDestroy: vi.fn(),
        onInject: vi.fn(),
        onRequest: vi.fn(),
        dispose: vi.fn(),
      };

      expect(hasOnInit(obj)).toBe(true);
      expect(hasOnDestroy(obj)).toBe(true);
      expect(hasOnInject(obj)).toBe(true);
      expect(hasOnRequest(obj)).toBe(true);
      expect(isDisposable(obj)).toBe(true);
    });

    it('should work with realistic service classes', () => {
      class ServiceWithLifecycle {
        onInit() { console.log('init'); }
        onDestroy() { console.log('destroy'); }
        dispose() { console.log('dispose'); }
      }

      const service = new ServiceWithLifecycle();

      expect(hasOnInit(service)).toBe(true);
      expect(hasOnDestroy(service)).toBe(true);
      expect(hasOnInject(service)).toBe(false);
      expect(hasOnRequest(service)).toBe(false);
      expect(isDisposable(service)).toBe(true);
    });

    it('should handle inheritance', () => {
      class BaseService {
        onInit() {}
      }

      class DerivedService extends BaseService {
        onDestroy() {}
      }

      const service = new DerivedService();

      expect(hasOnInit(service)).toBe(true);
      expect(hasOnDestroy(service)).toBe(true);
    });
  });
});
