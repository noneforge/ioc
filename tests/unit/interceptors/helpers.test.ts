import { describe, expect, it, vi } from 'vitest';

import { composeInterceptors, createInterceptor, InjectionToken, when } from '../../../src';
import type { ContainerLike, InjectionContext, Interceptor, InterceptorFn } from '../../../src';

// Type helper to avoid strict generic checking in test post hooks
const asPost = (fn: (ctx: InjectionContext, result: any) => any): any => fn;

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

const TOKEN_A = new InjectionToken<string>('A');

describe('Interceptor Helpers', () => {
  // ========== createInterceptor ==========

  describe('createInterceptor()', () => {
    it('should create interceptor with pre hook only', async () => {
      const preHook = vi.fn();
      const interceptor = createInterceptor({ pre: preHook });

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, () => 'result');

      expect(preHook).toHaveBeenCalledWith(mockContext);
      expect(preHook).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should create interceptor with post hook only', async () => {
      const interceptor = createInterceptor({
        post: asPost((_ctx, result: string) => result.toUpperCase()),
      });

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, () => 'hello');

      expect(result).toBe('HELLO');
    });

    it('should create interceptor with both pre and post hooks', async () => {
      const order: string[] = [];

      const interceptor = createInterceptor({
        pre: () => {
          order.push('pre');
        },
        post: asPost((_ctx, result: string) => {
          order.push('post');

          return result;
        }),
      });

      const mockContext = createMockContext(TOKEN_A);
      await interceptor(mockContext, () => {
        order.push('factory');

        return 'result';
      });

      expect(order).toEqual(['pre', 'factory', 'post']);
    });

    it('should pass context to both hooks', async () => {
      const preContext = vi.fn();
      const postContext = vi.fn();

      const interceptor = createInterceptor({
        pre: (ctx) => preContext(ctx),
        post: (ctx, result) => {
          postContext(ctx);

          return result;
        },
      });

      const mockContext = createMockContext(TOKEN_A);
      await interceptor(mockContext, () => 'result');

      expect(preContext).toHaveBeenCalledWith(mockContext);
      expect(postContext).toHaveBeenCalledWith(mockContext);
    });

    it('should handle async pre hook', async () => {
      const interceptor = createInterceptor({
        pre: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        },
      });

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, () => 'result');

      expect(result).toBe('result');
    });

    it('should handle async post hook', async () => {
      const interceptor = createInterceptor({
        post: asPost(async (_ctx, result: string) => {
          await new Promise((resolve) => setTimeout(resolve, 10));

          return result.toUpperCase();
        }),
      });

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, () => 'hello');

      expect(result).toBe('HELLO');
    });

    it('should handle async factory', async () => {
      const interceptor = createInterceptor({
        post: asPost((_ctx, result: string) => `wrapped:${result}`),
      });

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));

        return 'async-value';
      });

      expect(result).toBe('wrapped:async-value');
    });

    it('should work with empty options', async () => {
      const interceptor = createInterceptor({});

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, () => 'passthrough');

      expect(result).toBe('passthrough');
    });

    it('should allow storing data in context metadata', async () => {
      const interceptor = createInterceptor({
        pre: (ctx) => {
          ctx.metadata.set('startTime', 100);
        },
        post: (ctx, result) => {
          const startTime = ctx.metadata.get('startTime');

          return `${result}:${startTime}`;
        },
      });

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, () => 'value');

      expect(result).toBe('value:100');
    });
  });

  // ========== composeInterceptors ==========

  describe('composeInterceptors()', () => {
    it('should compose multiple functional interceptors', () => {
      const fn1: InterceptorFn = (_ctx, next) => `[1:${next()}]`;
      const fn2: InterceptorFn = (_ctx, next) => `[2:${next()}]`;

      const composed = composeInterceptors(fn1, fn2);

      const mockContext = createMockContext(TOKEN_A);
      const result = composed(mockContext, () => 'base');

      expect(result).toBe('[1:[2:base]]');
    });

    it('should compose class-based interceptors', () => {
      const interceptor1: Interceptor = {
        intercept: asIntercept((_ctx, next) => `[class1:${next()}]`),
      };
      const interceptor2: Interceptor = {
        intercept: asIntercept((_ctx, next) => `[class2:${next()}]`),
      };

      const composed = composeInterceptors(interceptor1, interceptor2);

      const mockContext = createMockContext(TOKEN_A);
      const result = composed(mockContext, () => 'base');

      expect(result).toBe('[class1:[class2:base]]');
    });

    it('should compose mixed class and functional interceptors', () => {
      const classInterceptor: Interceptor = {
        intercept: asIntercept((_ctx, next) => `[class:${next()}]`),
      };
      const fnInterceptor: InterceptorFn = (_ctx, next) => `[fn:${next()}]`;

      const composed = composeInterceptors(classInterceptor, fnInterceptor);

      const mockContext = createMockContext(TOKEN_A);
      const result = composed(mockContext, () => 'base');

      expect(result).toBe('[class:[fn:base]]');
    });

    it('should handle single interceptor', () => {
      const fn: InterceptorFn = (_ctx, next) => `wrapped:${next()}`;

      const composed = composeInterceptors(fn);

      const mockContext = createMockContext(TOKEN_A);
      const result = composed(mockContext, () => 'value');

      expect(result).toBe('wrapped:value');
    });

    it('should handle empty interceptors array', () => {
      const composed = composeInterceptors();

      const mockContext = createMockContext(TOKEN_A);
      const result = composed(mockContext, () => 'passthrough');

      expect(result).toBe('passthrough');
    });

    it('should execute interceptors in order', () => {
      const order: number[] = [];

      const fn1: InterceptorFn = (_ctx, next) => {
        order.push(1);
        const result = next();
        order.push(4);

        return result;
      };

      const fn2: InterceptorFn = (_ctx, next) => {
        order.push(2);
        const result = next();
        order.push(3);

        return result;
      };

      const composed = composeInterceptors(fn1, fn2);

      const mockContext = createMockContext(TOKEN_A);
      composed(mockContext, () => 'result');

      expect(order).toEqual([1, 2, 3, 4]);
    });

    it('should handle async interceptors', async () => {
      const fn1: InterceptorFn = async (_ctx, next) => {
        const result = await next();

        return `[1:${result}]`;
      };

      const fn2: InterceptorFn = async (_ctx, next) => {
        const result = await next();

        return `[2:${result}]`;
      };

      const composed = composeInterceptors(fn1, fn2);

      const mockContext = createMockContext(TOKEN_A);
      const result = await composed(mockContext, async () => 'base');

      expect(result).toBe('[1:[2:base]]');
    });

    it('should allow short-circuit', () => {
      const factory = vi.fn(() => 'original');
      const fn1: InterceptorFn = () => 'short-circuited';
      const fn2: InterceptorFn = (_ctx, next) => next();

      const composed = composeInterceptors(fn1, fn2);

      const mockContext = createMockContext(TOKEN_A);
      const result = composed(mockContext, factory);

      expect(result).toBe('short-circuited');
      expect(factory).not.toHaveBeenCalled();
    });
  });

  // ========== when ==========

  describe('when()', () => {
    it('should run interceptor when predicate returns true', () => {
      const interceptor = when(
        () => true,
        (_ctx, next) => `wrapped:${next()}`,
      );

      const mockContext = createMockContext(TOKEN_A);
      const result = interceptor(mockContext, () => 'value');

      expect(result).toBe('wrapped:value');
    });

    it('should skip interceptor when predicate returns false', () => {
      const innerInterceptor = vi.fn((_ctx: InjectionContext, next: () => unknown) => {
        return `wrapped:${next()}`;
      });

      const interceptor = when(() => false, innerInterceptor);

      const mockContext = createMockContext(TOKEN_A);
      const result = interceptor(mockContext, () => 'value');

      expect(result).toBe('value');
      expect(innerInterceptor).not.toHaveBeenCalled();
    });

    it('should pass context to predicate', () => {
      const predicateFn = vi.fn(() => true);

      const interceptor = when(predicateFn, (_ctx, next) => next());

      const mockContext = createMockContext(TOKEN_A);
      interceptor(mockContext, () => 'value');

      expect(predicateFn).toHaveBeenCalledWith(mockContext);
    });

    it('should work with class-based interceptor', () => {
      const classInterceptor: Interceptor = {
        intercept: asIntercept((_ctx, next) => `[class:${next()}]`),
      };

      const interceptor = when(() => true, classInterceptor);

      const mockContext = createMockContext(TOKEN_A);
      const result = interceptor(mockContext, () => 'base');

      expect(result).toBe('[class:base]');
    });

    it('should check metadata in predicate', () => {
      const interceptor = when(
        (ctx) => ctx.metadata.get('debug') === true,
        (_ctx, next) => `debug:${next()}`,
      );

      const mockContext = createMockContext(TOKEN_A);

      // Without debug flag
      const result1 = interceptor(mockContext, () => 'value');
      expect(result1).toBe('value');

      // With debug flag
      mockContext.metadata.set('debug', true);
      const result2 = interceptor(mockContext, () => 'value');
      expect(result2).toBe('debug:value');
    });

    it('should check token in predicate', () => {
      const TOKEN_B = new InjectionToken<string>('B');

      const interceptor = when(
        (ctx) => ctx.token === TOKEN_A,
        (_ctx, next) => `matched:${next()}`,
      );

      const contextA = createMockContext(TOKEN_A);
      const contextB = createMockContext(TOKEN_B);

      const resultA = interceptor(contextA, () => 'value');
      const resultB = interceptor(contextB, () => 'value');

      expect(resultA).toBe('matched:value');
      expect(resultB).toBe('value');
    });

    it('should handle async interceptor', async () => {
      const interceptor = when(
        () => true,
        async (_ctx, next) => {
          const result = await next();

          return `async:${result}`;
        },
      );

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, async () => 'value');

      expect(result).toBe('async:value');
    });

    it('should handle async factory when skipped', async () => {
      const interceptor = when(() => false, (_ctx, next) => next());

      const mockContext = createMockContext(TOKEN_A);
      const result = await interceptor(mockContext, async () => 'async-value');

      expect(result).toBe('async-value');
    });

    it('should work with composed interceptors', () => {
      const debugInterceptor = when(
        (ctx) => ctx.metadata.get('debug') === true,
        (_ctx, next) => `[debug:${next()}]`,
      );

      const alwaysInterceptor: InterceptorFn = (_ctx, next) => `[always:${next()}]`;

      const composed = composeInterceptors(debugInterceptor, alwaysInterceptor);

      const mockContext = createMockContext(TOKEN_A);

      // Without debug
      const result1 = composed(mockContext, () => 'base');
      expect(result1).toBe('[always:base]');

      // With debug
      mockContext.metadata.set('debug', true);
      const result2 = composed(mockContext, () => 'base');
      expect(result2).toBe('[debug:[always:base]]');
    });
  });
});
