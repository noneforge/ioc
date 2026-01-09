import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerLike, InjectionContext, Interceptor, InterceptorFn } from '../../../src';
import { InjectionToken, InterceptorChain } from '../../../src';

// Type-safe helper to create test interceptors (avoids strict generic checking)
const asIntercept = (fn: (ctx: InjectionContext, next: () => any) => any): Interceptor['intercept'] =>
  fn as Interceptor['intercept'];

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

describe('InterceptorChain', () => {
  let chain: InterceptorChain;
  let mockContext: InjectionContext;

  beforeEach(() => {
    chain = new InterceptorChain();
    mockContext = createMockContext(TOKEN_A);
  });

  // ========== Constructor ==========

  describe('constructor', () => {
    it('should create empty chain', () => {
      const newChain = new InterceptorChain();

      // Empty chain should just call factory
      const result = newChain.execute(mockContext, () => 'test');
      expect(result).toBe('test');
    });

    it('should accept initial interceptors', () => {
      const interceptor: Interceptor = {
        intercept: (_ctx, next) => next(),
      };
      const newChain = new InterceptorChain([interceptor]);

      const result = newChain.execute(mockContext, () => 'test');
      expect(result).toBe('test');
    });
  });

  // ========== add() ==========

  describe('add()', () => {
    it('should add interceptor to chain', () => {
      const interceptor: Interceptor = {
        intercept: asIntercept((_ctx, next) => {
          const result = next();

          return `intercepted: ${result}`;
        }),
      };

      chain.add(interceptor);
      const result = chain.execute(mockContext, () => 'original');

      expect(result).toBe('intercepted: original');
    });

    it('should add multiple interceptors', () => {
      const interceptor1: Interceptor = {
        intercept: asIntercept((_ctx, next) => {
          const result = next();

          return `[1:${result}]`;
        }),
      };
      const interceptor2: Interceptor = {
        intercept: asIntercept((_ctx, next) => {
          const result = next();

          return `[2:${result}]`;
        }),
      };

      chain.add(interceptor1);
      chain.add(interceptor2);

      const result = chain.execute(mockContext, () => 'base');

      // Interceptors execute in order: 1 -> 2 -> factory
      // Result builds up: base -> [2:base] -> [1:[2:base]]
      expect(result).toBe('[1:[2:base]]');
    });
  });

  // ========== execute() ==========

  describe('execute()', () => {
    it('should call factory when no interceptors', () => {
      const factory = vi.fn(() => 'result');

      const result = chain.execute(mockContext, factory);

      expect(result).toBe('result');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should pass context to interceptor', () => {
      const capturedContext = vi.fn();
      const interceptor: Interceptor = {
        intercept: (ctx, next) => {
          capturedContext(ctx);

          return next();
        },
      };

      chain.add(interceptor);
      chain.execute(mockContext, () => 'test');

      expect(capturedContext).toHaveBeenCalledWith(mockContext);
    });

    it('should execute interceptors in order', () => {
      const order: number[] = [];

      const interceptor1: Interceptor = {
        intercept: (_ctx, next) => {
          order.push(1);
          const result = next();
          order.push(4);

          return result;
        },
      };
      const interceptor2: Interceptor = {
        intercept: (_ctx, next) => {
          order.push(2);
          const result = next();
          order.push(3);

          return result;
        },
      };

      chain.add(interceptor1);
      chain.add(interceptor2);
      chain.execute(mockContext, () => 'test');

      // Pre-interceptor order: 1 -> 2
      // Post-interceptor order: 3 -> 4 (reverse)
      expect(order).toEqual([1, 2, 3, 4]);
    });

    it('should allow interceptor to modify result', () => {
      const interceptor: Interceptor = {
        intercept: asIntercept((_ctx, next) => {
          const result = next() as string;

          return result.toUpperCase();
        }),
      };

      chain.add(interceptor);
      const result = chain.execute(mockContext, () => 'hello');

      expect(result).toBe('HELLO');
    });

    it('should allow interceptor to short-circuit chain', () => {
      const factory = vi.fn(() => 'original');
      const interceptor: Interceptor = {
        intercept: asIntercept(() => 'short-circuited'),
      };

      chain.add(interceptor);
      const result = chain.execute(mockContext, factory);

      expect(result).toBe('short-circuited');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should propagate errors from interceptors', () => {
      const interceptor: Interceptor = {
        intercept: () => {
          throw new Error('Interceptor error');
        },
      };

      chain.add(interceptor);

      expect(() => chain.execute(mockContext, () => 'test')).toThrow('Interceptor error');
    });

    it('should propagate errors from factory', () => {
      const interceptor: Interceptor = {
        intercept: (_ctx, next) => next(),
      };

      chain.add(interceptor);

      expect(() =>
        chain.execute(mockContext, () => {
          throw new Error('Factory error');
        }),
      ).toThrow('Factory error');
    });

    it('should allow interceptor to catch and handle factory errors', () => {
      const interceptor: Interceptor = {
        intercept: asIntercept((_ctx, next) => {
          try {
            return next();
          } catch {
            return 'error-handled';
          }
        }),
      };

      chain.add(interceptor);
      const result = chain.execute(mockContext, () => {
        throw new Error('Factory error');
      });

      expect(result).toBe('error-handled');
    });

    it('should support generic return types', () => {
      interface User {
        name: string;
        age: number;
      }

      const interceptor: Interceptor = {
        intercept: (_ctx, next) => next(),
      };

      chain.add(interceptor);
      const result = chain.execute<User>(mockContext, () => ({
        name: 'John',
        age: 30,
      }));

      expect(result).toEqual({ name: 'John', age: 30 });
    });
  });

  // ========== executeAsync() ==========

  describe('executeAsync()', () => {
    it('should call async factory when no interceptors', async () => {
      const factory = vi.fn(async () => 'async-result');

      const result = await chain.executeAsync(mockContext, factory);

      expect(result).toBe('async-result');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should handle sync factory in executeAsync', async () => {
      const result = await chain.executeAsync(mockContext, () => 'sync-result');

      expect(result).toBe('sync-result');
    });

    it('should pass context to async interceptor', async () => {
      const capturedContext = vi.fn();
      const interceptor: Interceptor = {
        intercept: async (ctx, next) => {
          capturedContext(ctx);

          return next();
        },
      };

      chain.add(interceptor);
      await chain.executeAsync(mockContext, async () => 'test');

      expect(capturedContext).toHaveBeenCalledWith(mockContext);
    });

    it('should execute async interceptors in order', async () => {
      const order: number[] = [];

      const interceptor1: Interceptor = {
        intercept: async (_ctx, next) => {
          order.push(1);
          const result = await next();
          order.push(4);

          return result;
        },
      };
      const interceptor2: Interceptor = {
        intercept: async (_ctx, next) => {
          order.push(2);
          const result = await next();
          order.push(3);

          return result;
        },
      };

      chain.add(interceptor1);
      chain.add(interceptor2);
      await chain.executeAsync(mockContext, async () => 'test');

      expect(order).toEqual([1, 2, 3, 4]);
    });

    it('should allow async interceptor to modify result', async () => {
      const interceptor: Interceptor = {
        intercept: asIntercept(async (_ctx, next) => {
          const result = (await next()) as string;

          return result.toUpperCase();
        }),
      };

      chain.add(interceptor);
      const result = await chain.executeAsync(mockContext, async () => 'hello');

      expect(result).toBe('HELLO');
    });

    it('should allow async interceptor to short-circuit chain', async () => {
      const factory = vi.fn(async () => 'original');
      const interceptor: Interceptor = {
        intercept: asIntercept(async () => 'short-circuited'),
      };

      chain.add(interceptor);
      const result = await chain.executeAsync(mockContext, factory);

      expect(result).toBe('short-circuited');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should propagate async errors from interceptors', async () => {
      const interceptor: Interceptor = {
        intercept: async () => {
          throw new Error('Async interceptor error');
        },
      };

      chain.add(interceptor);

      await expect(chain.executeAsync(mockContext, async () => 'test')).rejects.toThrow(
        'Async interceptor error',
      );
    });

    it('should propagate async errors from factory', async () => {
      const interceptor: Interceptor = {
        intercept: async (_ctx, next) => next(),
      };

      chain.add(interceptor);

      await expect(
        chain.executeAsync(mockContext, async () => {
          throw new Error('Async factory error');
        }),
      ).rejects.toThrow('Async factory error');
    });

    it('should allow async interceptor to catch and handle factory errors', async () => {
      const interceptor: Interceptor = {
        intercept: asIntercept(async (_ctx, next) => {
          try {
            return await next();
          } catch {
            return 'async-error-handled';
          }
        }),
      };

      chain.add(interceptor);
      const result = await chain.executeAsync(mockContext, async () => {
        throw new Error('Factory error');
      });

      expect(result).toBe('async-error-handled');
    });

    it('should handle delayed async operations', async () => {
      const interceptor: Interceptor = {
        intercept: async (_ctx, next) => {
          await new Promise((resolve) => setTimeout(resolve, 10));

          return next();
        },
      };

      chain.add(interceptor);
      const result = await chain.executeAsync(mockContext, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));

        return 'delayed-result';
      });

      expect(result).toBe('delayed-result');
    });
  });

  // ========== Mixed sync/async ==========

  describe('Mixed sync/async interceptors', () => {
    it('should pass Promise to sync interceptor in async chain', async () => {
      // This test documents the behavior: sync interceptors receive Promise objects
      // when used in async chains. For proper async handling, interceptors should
      // use async/await.
      const syncInterceptor: Interceptor = {
        intercept: (_ctx, next) => {
           // Returns Promise in async context
          // Sync interceptor receives Promise, not resolved value
          return next();
        },
      };

      chain.add(syncInterceptor);
      const result = await chain.executeAsync(mockContext, async () => 'async-value');

      // The Promise is passed through and resolved by executeAsync
      expect(result).toBe('async-value');
    });

    it('should handle multiple mixed interceptors', async () => {
      const syncInterceptor: Interceptor = {
        intercept: (_ctx, next) => next(),
      };
      const asyncInterceptor: Interceptor = {
        intercept: asIntercept(async (_ctx, next) => {
          const result = await next();

          return `async:${result}`;
        }),
      };

      chain.add(syncInterceptor);
      chain.add(asyncInterceptor);

      const result = await chain.executeAsync(mockContext, async () => 'base');

      expect(result).toBe('async:base');
    });
  });

  // ========== Edge Cases ==========

  describe('Edge Cases', () => {
    it('should handle undefined return from factory', () => {
      const result = chain.execute(mockContext, () => undefined);
      expect(result).toBeUndefined();
    });

    it('should handle null return from factory', () => {
      const result = chain.execute(mockContext, () => null);
      expect(result).toBeNull();
    });

    it('should handle object return from factory', () => {
      const obj = { key: 'value' };
      const result = chain.execute(mockContext, () => obj);
      expect(result).toBe(obj);
    });

    it('should handle array return from factory', () => {
      const arr = [1, 2, 3];
      const result = chain.execute(mockContext, () => arr);
      expect(result).toBe(arr);
    });

    it('should handle many interceptors', () => {
      const count = 100;
      for (let i = 0; i < count; i++) {
        chain.add({
          intercept: (_ctx, next) => next(),
        });
      }

      const factory = vi.fn(() => 'result');
      const result = chain.execute(mockContext, factory);

      expect(result).toBe('result');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should preserve this context in factory', () => {
      const obj = {
        value: 'test',
        getFactory() {
          return () => this.value;
        },
      };

      const factory = obj.getFactory();
      const result = chain.execute(mockContext, factory);

      expect(result).toBe('test');
    });
  });

  // ========== Functional Interceptors ==========

  describe('Functional Interceptors', () => {
    it('should accept functional interceptor in constructor', () => {
      const fn: InterceptorFn = (_ctx, next) => next();
      const newChain = new InterceptorChain([fn]);

      const result = newChain.execute(mockContext, () => 'test');
      expect(result).toBe('test');
    });

    it('should accept functional interceptor via add()', () => {
      const fn: InterceptorFn = (_ctx, next) => {
        const result = next() as string;

        return `intercepted: ${result}`;
      };

      chain.add(fn);
      const result = chain.execute(mockContext, () => 'original');

      expect(result).toBe('intercepted: original');
    });

    it('should pass context to functional interceptor', () => {
      const capturedContext = vi.fn();
      const fn: InterceptorFn = (ctx, next) => {
        capturedContext(ctx);

        return next();
      };

      chain.add(fn);
      chain.execute(mockContext, () => 'test');

      expect(capturedContext).toHaveBeenCalledWith(mockContext);
    });

    it('should allow functional interceptor to modify result', () => {
      const fn: InterceptorFn = (_ctx, next) => {
        const result = next() as string;

        return result.toUpperCase();
      };

      chain.add(fn);
      const result = chain.execute(mockContext, () => 'hello');

      expect(result).toBe('HELLO');
    });

    it('should allow functional interceptor to short-circuit chain', () => {
      const factory = vi.fn(() => 'original');
      const fn: InterceptorFn = () => 'short-circuited';

      chain.add(fn);
      const result = chain.execute(mockContext, factory);

      expect(result).toBe('short-circuited');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should mix class and functional interceptors', () => {
      const classInterceptor: Interceptor = {
        intercept: asIntercept((_ctx, next) => {
          const result = next() as string;

          return `[class:${result}]`;
        }),
      };

      const fnInterceptor: InterceptorFn = (_ctx, next) => {
        const result = next() as string;

        return `[fn:${result}]`;
      };

      const newChain = new InterceptorChain([classInterceptor, fnInterceptor]);
      const result = newChain.execute(mockContext, () => 'base');

      // Interceptors execute in order: class -> fn -> factory
      // Result builds: base -> [fn:base] -> [class:[fn:base]]
      expect(result).toBe('[class:[fn:base]]');
    });

    it('should execute mixed interceptors in correct order', () => {
      const order: string[] = [];

      const classInterceptor: Interceptor = {
        intercept: (_ctx, next) => {
          order.push('class-pre');
          const result = next();
          order.push('class-post');

          return result;
        },
      };

      const fnInterceptor: InterceptorFn = (_ctx, next) => {
        order.push('fn-pre');
        const result = next();
        order.push('fn-post');

        return result;
      };

      chain.add(classInterceptor);
      chain.add(fnInterceptor);
      chain.execute(mockContext, () => {
        order.push('factory');

        return 'result';
      });

      expect(order).toEqual(['class-pre', 'fn-pre', 'factory', 'fn-post', 'class-post']);
    });

    it('should handle async functional interceptor', async () => {
      const fn: InterceptorFn = async (_ctx, next) => {
        const result = (await next()) as string;

        return result.toUpperCase();
      };

      chain.add(fn);
      const result = await chain.executeAsync(mockContext, async () => 'hello');

      expect(result).toBe('HELLO');
    });

    it('should mix class and functional interceptors in async chain', async () => {
      const classInterceptor: Interceptor = {
        intercept: asIntercept(async (_ctx, next) => {
          const result = (await next()) as string;

          return `[class:${result}]`;
        }),
      };

      const fnInterceptor: InterceptorFn = async (_ctx, next) => {
        const result = (await next()) as string;

        return `[fn:${result}]`;
      };

      chain.add(classInterceptor);
      chain.add(fnInterceptor);
      const result = await chain.executeAsync(mockContext, async () => 'base');

      expect(result).toBe('[class:[fn:base]]');
    });

    it('should handle functional interceptor errors', () => {
      const fn: InterceptorFn = () => {
        throw new Error('Functional interceptor error');
      };

      chain.add(fn);

      expect(() => chain.execute(mockContext, () => 'test')).toThrow(
        'Functional interceptor error',
      );
    });

    it('should allow functional interceptor to catch errors', () => {
      const fn: InterceptorFn = (_ctx, next) => {
        try {
          return next();
        } catch {
          return 'error-handled';
        }
      };

      chain.add(fn);
      const result = chain.execute(mockContext, () => {
        throw new Error('Factory error');
      });

      expect(result).toBe('error-handled');
    });

    it('should support inline arrow function interceptors', () => {
      chain.add((_ctx, next) => {
        const result = next() as string;

        return `wrapped:${result}`;
      });

      const result = chain.execute(mockContext, () => 'value');

      expect(result).toBe('wrapped:value');
    });

    it('should handle multiple functional interceptors', () => {
      const fn1: InterceptorFn = (_ctx, next) => `[1:${next()}]`;
      const fn2: InterceptorFn = (_ctx, next) => `[2:${next()}]`;
      const fn3: InterceptorFn = (_ctx, next) => `[3:${next()}]`;

      chain.add(fn1);
      chain.add(fn2);
      chain.add(fn3);

      const result = chain.execute(mockContext, () => 'base');

      expect(result).toBe('[1:[2:[3:base]]]');
    });
  });
});
