import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerLike, InjectionContext } from '../../../../src';
import { CachingInterceptor, InjectionToken } from '../../../../src';

// Helper to create mock injection context
function createMockContext(token?: unknown): InjectionContext {
  return {
    container: {
      get: () => null,
      getAsync: async () => null,
      has: () => false,
      getAll: () => [],
    } as ContainerLike,
    token: token as InjectionContext['token'],
    requestId: undefined,
    metadata: new Map(),
    depth: 0,
    path: [],
    strategy: 'default',
  };
}

// Test tokens
const TOKEN_A = new InjectionToken<string>('A');
const TOKEN_B = new InjectionToken<string>('B');

describe('CachingInterceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========== Constructor ==========

  describe('constructor', () => {
    it('should create with default TTL', () => {
      const interceptor = new CachingInterceptor();
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => 'value');

      expect(result).toBe('value');
    });

    it('should accept custom TTL', () => {
      const interceptor = new CachingInterceptor(30000);
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => 'value');

      expect(result).toBe('value');
    });
  });

  // ========== intercept() ==========

  describe('intercept()', () => {
    it('should call factory on first invocation', () => {
      const interceptor = new CachingInterceptor();
      const context = createMockContext(TOKEN_A);
      const factory = vi.fn(() => 'result');

      const result = interceptor.intercept(context, factory);

      expect(result).toBe('result');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on subsequent calls', () => {
      const interceptor = new CachingInterceptor();
      const context = createMockContext(TOKEN_A);
      const factory = vi.fn(() => 'result');

      interceptor.intercept(context, factory);
      const result = interceptor.intercept(context, factory);

      expect(result).toBe('result');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should cache different tokens separately', () => {
      const interceptor = new CachingInterceptor();
      const contextA = createMockContext(TOKEN_A);
      const contextB = createMockContext(TOKEN_B);
      const factoryA = vi.fn(() => 'A');
      const factoryB = vi.fn(() => 'B');

      const resultA = interceptor.intercept(contextA, factoryA);
      const resultB = interceptor.intercept(contextB, factoryB);

      expect(resultA).toBe('A');
      expect(resultB).toBe('B');
      expect(factoryA).toHaveBeenCalledTimes(1);
      expect(factoryB).toHaveBeenCalledTimes(1);
    });

    it('should expire cache after TTL', () => {
      const ttl = 5000;
      const interceptor = new CachingInterceptor(ttl);
      const context = createMockContext(TOKEN_A);
      let callCount = 0;
      const factory = () => {
        callCount += 1;

        return `result-${callCount}`;
      };

      const result1 = interceptor.intercept(context, factory);
      expect(result1).toBe('result-1');

      // Advance time past TTL
      vi.advanceTimersByTime(ttl + 100);

      const result2 = interceptor.intercept(context, factory);
      expect(result2).toBe('result-2');
    });

    it('should not expire cache before TTL', () => {
      const ttl = 5000;
      const interceptor = new CachingInterceptor(ttl);
      const context = createMockContext(TOKEN_A);
      const factory = vi.fn(() => 'result');

      interceptor.intercept(context, factory);

      // Advance time but stay within TTL
      vi.advanceTimersByTime(ttl - 100);

      interceptor.intercept(context, factory);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined token', () => {
      const interceptor = new CachingInterceptor();
      const context = createMockContext(undefined);
      const factory = vi.fn(() => 'result');

      const result = interceptor.intercept(context, factory);

      expect(result).toBe('result');
    });

    it('should cache Promise results', async () => {
      const interceptor = new CachingInterceptor();
      const context = createMockContext(TOKEN_A);
      const factory = vi.fn(async () => 'async-result');

      const result1 = await interceptor.intercept(context, factory);
      const result2 = await interceptor.intercept(context, factory);

      expect(result1).toBe('async-result');
      expect(result2).toBe('async-result');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should cache null values', () => {
      const interceptor = new CachingInterceptor();
      const context = createMockContext(TOKEN_A);
      const factory = vi.fn(() => null);

      interceptor.intercept(context, factory);
      interceptor.intercept(context, factory);

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should cache objects by reference', () => {
      const interceptor = new CachingInterceptor();
      const context = createMockContext(TOKEN_A);
      const obj = { key: 'value' };
      const factory = vi.fn(() => obj);

      const result1 = interceptor.intercept(context, factory);
      const result2 = interceptor.intercept(context, factory);

      expect(result1).toBe(obj);
      expect(result2).toBe(obj);
      expect(result1).toBe(result2);
    });
  });

  // ========== Edge Cases ==========

  describe('Edge Cases', () => {
    it('should handle class token', () => {
      class MyService {}
      const interceptor = new CachingInterceptor();
      const context = createMockContext(MyService);
      const factory = vi.fn(() => new MyService());

      interceptor.intercept(context, factory);
      interceptor.intercept(context, factory);

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should handle string token', () => {
      const interceptor = new CachingInterceptor();
      const context = createMockContext('STRING_TOKEN');
      const factory = vi.fn(() => 'result');

      interceptor.intercept(context, factory);
      interceptor.intercept(context, factory);

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should handle symbol token', () => {
      const symToken = Symbol('TOKEN');
      const interceptor = new CachingInterceptor();
      const context = createMockContext(symToken);
      const factory = vi.fn(() => 'result');

      interceptor.intercept(context, factory);
      interceptor.intercept(context, factory);

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple interceptor instances independently', () => {
      const interceptor1 = new CachingInterceptor();
      const interceptor2 = new CachingInterceptor();
      const context = createMockContext(TOKEN_A);
      const factory = vi.fn(() => 'result');

      interceptor1.intercept(context, factory);
      interceptor2.intercept(context, factory);

      expect(factory).toHaveBeenCalledTimes(2);
    });
  });
});
