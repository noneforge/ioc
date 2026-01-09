import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerLike, InjectionContext, Logger } from '../../../../src';
import { InjectionToken, LoggingInterceptor } from '../../../../src';

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

describe('LoggingInterceptor', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    };
  });

  // ========== Constructor ==========

  describe('constructor', () => {
    it('should create without logger (uses console)', () => {
      const interceptor = new LoggingInterceptor();
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => 'value');

      expect(result).toBe('value');
    });

    it('should accept custom logger', () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);

      interceptor.intercept(context, () => 'value');

      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  // ========== Sync intercept() ==========

  describe('intercept() sync', () => {
    it('should log before and after resolution', () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);

      interceptor.intercept(context, () => 'result');

      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, 'Resolving: InjectionToken(A)');
      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/^Resolved: InjectionToken\(A\) \(\d+ms\)$/),
      );
    });

    it('should return factory result', () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => 'my-result');

      expect(result).toBe('my-result');
    });

    it('should log error on factory throw', () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);
      const error = new Error('Factory error');

      expect(() => {
        interceptor.intercept(context, () => {
          throw error;
        });
      }).toThrow('Factory error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed: InjectionToken(A)', error);
    });

    it('should rethrow error after logging', () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);

      expect(() => {
        interceptor.intercept(context, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    it('should handle undefined token', () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(undefined);

      interceptor.intercept(context, () => 'result');

      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, 'Resolving: unknown');
    });
  });

  // ========== Async intercept() ==========

  describe('intercept() async', () => {
    it('should log before and after async resolution', async () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);

      await interceptor.intercept(context, async () => 'async-result');

      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, 'Resolving: InjectionToken(A)');
      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/^Resolved: InjectionToken\(A\) \(\d+ms\)$/),
      );
    });

    it('should return async factory result', async () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);

      const result = await interceptor.intercept(context, async () => 'async-value');

      expect(result).toBe('async-value');
    });

    it('should log error on async factory rejection', async () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);
      const error = new Error('Async error');

      await expect(
        interceptor.intercept(context, async () => {
          throw error;
        }),
      ).rejects.toThrow('Async error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed: InjectionToken(A)', error);
    });

    it('should handle non-Error rejection', async () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(TOKEN_A);

      await expect(
        interceptor.intercept(context, async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'string error';
        }),
      ).rejects.toBe('string error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed: InjectionToken(A)',
        expect.any(Error),
      );
    });
  });

  // ========== Logger interface ==========

  describe('Logger interface', () => {
    it('should work without debug method', () => {
      const partialLogger: Logger = {
        error: vi.fn(),
      };
      const interceptor = new LoggingInterceptor(partialLogger);
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => 'result');

      expect(result).toBe('result');
    });

    it('should work without error method', () => {
      const partialLogger: Logger = {
        debug: vi.fn(),
      };
      const interceptor = new LoggingInterceptor(partialLogger);
      const context = createMockContext(TOKEN_A);

      expect(() => {
        interceptor.intercept(context, () => {
          throw new Error('Test');
        });
      }).toThrow('Test');
    });

    it('should work with empty logger object', () => {
      const emptyLogger: Logger = {};
      const interceptor = new LoggingInterceptor(emptyLogger);
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => 'result');

      expect(result).toBe('result');
    });
  });

  // ========== Edge Cases ==========

  describe('Edge Cases', () => {
    it('should handle class token', () => {
      class MyService {}
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(MyService);

      interceptor.intercept(context, () => new MyService());

      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, 'Resolving: MyService');
    });

    it('should handle string token', () => {
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext('MY_TOKEN');

      interceptor.intercept(context, () => 'result');

      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, 'Resolving: MY_TOKEN');
    });

    it('should handle symbol token', () => {
      const symToken = Symbol('MY_SYMBOL');
      const interceptor = new LoggingInterceptor(mockLogger);
      const context = createMockContext(symToken);

      interceptor.intercept(context, () => 'result');

      expect(mockLogger.debug).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Symbol'),
      );
    });
  });
});
