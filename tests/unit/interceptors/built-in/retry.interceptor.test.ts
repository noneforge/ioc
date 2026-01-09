import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerLike, InjectionContext } from '../../../../src';
import { InjectionToken, RetryInterceptor } from '../../../../src';

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

// Test token
const TOKEN_A = new InjectionToken<string>('A');

describe('RetryInterceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========== Constructor ==========

  describe('constructor', () => {
    it('should create with default values', () => {
      const interceptor = new RetryInterceptor();
      expect(interceptor).toBeDefined();
    });

    it('should accept custom maxRetries', async () => {
      const interceptor = new RetryInterceptor(2);
      const context = createMockContext(TOKEN_A);
      let attempt = 0;

      const promise = interceptor.intercept(context, async () => {
        attempt += 1;
        if (attempt < 3) {throw new Error('Retry');}

        return 'success';
      });

      // Fast-forward through all delays
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(attempt).toBe(3);
    });

    it('should accept custom delay', async () => {
      const delay = 500;
      const interceptor = new RetryInterceptor(3, delay);
      const context = createMockContext(TOKEN_A);
      let attempt = 0;

      const promise = interceptor.intercept(context, async () => {
        attempt += 1;
        if (attempt < 2) {throw new Error('Retry');}

        return 'success';
      });

      // Check delay timing - first retry at delay, second at delay * 2
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(attempt).toBe(1);

      await vi.advanceTimersByTimeAsync(2);
      expect(attempt).toBe(2);

      await promise;
    });
  });

  // ========== intercept() ==========

  describe('intercept()', () => {
    it('should return result on first success', async () => {
      const interceptor = new RetryInterceptor();
      const context = createMockContext(TOKEN_A);
      const factory = vi.fn(async () => 'success');

      const result = await interceptor.intercept(context, factory);

      expect(result).toBe('success');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const interceptor = new RetryInterceptor(3, 100);
      const context = createMockContext(TOKEN_A);
      let attempt = 0;

      const promise = interceptor.intercept(context, async () => {
        attempt += 1;
        if (attempt < 3) {throw new Error('Temporary failure');}

        return 'success';
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(attempt).toBe(3);
    });

    it('should throw after exhausting retries', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const interceptor = new RetryInterceptor(2, 1); // Very short delay
      const context = createMockContext(TOKEN_A);

      await expect(
        interceptor.intercept(context, async () => {
          throw new Error('Persistent error');
        }),
      ).rejects.toThrow('Persistent error');
      vi.useFakeTimers(); // Restore fake timers
    });

    it('should use exponential backoff', async () => {
      const baseDelay = 100;
      const interceptor = new RetryInterceptor(3, baseDelay);
      const context = createMockContext(TOKEN_A);
      let attempt = 0;
      const timestamps: number[] = [];

      const promise = interceptor.intercept(context, async () => {
        timestamps.push(Date.now());
        attempt += 1;
        if (attempt <= 3) {throw new Error('Retry');}

        return 'success';
      });

      // First attempt immediately
      expect(timestamps).toHaveLength(1);

      // Second attempt after delay * 2^0 = 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(timestamps).toHaveLength(2);

      // Third attempt after delay * 2^1 = 200ms
      await vi.advanceTimersByTimeAsync(200);
      expect(timestamps).toHaveLength(3);

      // Fourth attempt after delay * 2^2 = 400ms
      await vi.advanceTimersByTimeAsync(400);
      expect(timestamps).toHaveLength(4);

      await promise;
    });

    it('should handle sync factory wrapped in Promise', async () => {
      const interceptor = new RetryInterceptor();
      const context = createMockContext(TOKEN_A);

      const result = await interceptor.intercept(context, () => 'sync-value');

      expect(result).toBe('sync-value');
    });

    it('should preserve error type', async () => {
      class CustomError extends Error {
        constructor(public readonly code: number) {
          super('Custom error');
        }
      }

      const interceptor = new RetryInterceptor(0, 100);
      const context = createMockContext(TOKEN_A);
      const customError = new CustomError(42);

      await expect(
        interceptor.intercept(context, async () => {
          throw customError;
        }),
      ).rejects.toThrow(customError);
    });

    it('should work with zero retries', async () => {
      const interceptor = new RetryInterceptor(0);
      const context = createMockContext(TOKEN_A);
      const factory = vi.fn(async () => {
        throw new Error('Fail');
      });

      await expect(interceptor.intercept(context, factory)).rejects.toThrow('Fail');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should handle factory returning rejected promise', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const interceptor = new RetryInterceptor(1, 1); // Very short delay
      const context = createMockContext(TOKEN_A);
      let attempt = 0;

      await expect(
        interceptor.intercept(context, () => {
          attempt += 1;

          return Promise.reject(new Error('Final error'));
        }),
      ).rejects.toThrow('Final error');
      expect(attempt).toBe(2); // 1 initial + 1 retry
      vi.useFakeTimers(); // Restore fake timers
    });
  });

  // ========== Edge Cases ==========

  describe('Edge Cases', () => {
    it('should handle undefined error', async () => {
      const interceptor = new RetryInterceptor(0);
      const context = createMockContext(TOKEN_A);

      // Factory that doesn't throw but we somehow get no lastError
      const result = await interceptor.intercept(context, async () => 'value');

      expect(result).toBe('value');
    });

    it('should handle maxRetries = 0 with success', async () => {
      const interceptor = new RetryInterceptor(0);
      const context = createMockContext(TOKEN_A);

      const result = await interceptor.intercept(context, async () => 'success');

      expect(result).toBe('success');
    });

    it('should handle large maxRetries', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const interceptor = new RetryInterceptor(10, 1); // Very short delay
      const context = createMockContext(TOKEN_A);
      let attempt = 0;

      const result = await interceptor.intercept(context, async () => {
        attempt += 1;
        if (attempt < 8) {throw new Error('Keep trying');}

        return 'finally';
      });

      expect(result).toBe('finally');
      expect(attempt).toBe(8);
      vi.useFakeTimers(); // Restore fake timers
    });

    it('should call factory with correct context each retry', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const interceptor = new RetryInterceptor(2, 1); // Very short delay
      const context = createMockContext(TOKEN_A);
      let callCount = 0;

      await expect(
        interceptor.intercept(context, async () => {
          callCount += 1;

          throw new Error('Fail');
        }),
      ).rejects.toThrow('Fail');
      expect(callCount).toBe(3); // 1 initial + 2 retries
      vi.useFakeTimers(); // Restore fake timers
    });
  });
});
