import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerLike, InjectionContext, Middleware } from '../../../src';
import { InjectionToken, MiddlewareRunner } from '../../../src';

// Helper to create mock injection context
function createMockContext(token?: unknown): InjectionContext {
  return {
    container: {
      get: () => null,
      getAsync: async () => Promise.resolve(null),
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

describe('MiddlewareRunner', () => {
  let runner: MiddlewareRunner;
  let mockContext: InjectionContext;

  beforeEach(() => {
    runner = new MiddlewareRunner();
    mockContext = createMockContext(TOKEN_A);
  });

  // ========== add() ==========

  describe('add()', () => {
    it('should add middleware', () => {
      const middleware: Middleware = { priority: 100 };
      runner.add(middleware);
      expect(runner.getMiddlewares()).toHaveLength(1);
    });

    it('should sort by priority ascending (lower first)', () => {
      runner.add({ priority: 100 });
      runner.add({ priority: 50 });
      runner.add({ priority: 200 });

      const middlewares = runner.getMiddlewares();
      expect(middlewares[0].priority).toBe(50);
      expect(middlewares[1].priority).toBe(100);
      expect(middlewares[2].priority).toBe(200);
    });

    it('should maintain insertion order for same priority', () => {
      const first: Middleware = { priority: 100 };
      const second: Middleware = { priority: 100 };

      runner.add(first);
      runner.add(second);

      const middlewares = runner.getMiddlewares();
      expect(middlewares[0]).toBe(first);
      expect(middlewares[1]).toBe(second);
    });
  });

  // ========== getMiddlewares() ==========

  describe('getMiddlewares()', () => {
    it('should return empty array when no middlewares', () => {
      expect(runner.getMiddlewares()).toEqual([]);
    });

    it('should return a copy of middlewares', () => {
      const middleware: Middleware = { priority: 100 };
      runner.add(middleware);

      const result1 = runner.getMiddlewares();
      const result2 = runner.getMiddlewares();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  // ========== runPre() ==========

  describe('runPre()', () => {
    it('should run pre hooks in priority order', async () => {
      const order: number[] = [];

      runner.add({
        priority: 100,
        pre: () => {
          order.push(100);
        },
      });
      runner.add({
        priority: 50,
        pre: () => {
          order.push(50);
        },
      });
      runner.add({
        priority: 200,
        pre: () => {
          order.push(200);
        },
      });

      await runner.runPre(mockContext);

      expect(order).toEqual([50, 100, 200]);
    });

    it('should skip middlewares without pre hook', async () => {
      const preFn = vi.fn();

      runner.add({ priority: 100 });
      runner.add({ priority: 50, pre: preFn });

      await runner.runPre(mockContext);

      expect(preFn).toHaveBeenCalledTimes(1);
      expect(preFn).toHaveBeenCalledWith(mockContext);
    });

    it('should handle async pre hooks', async () => {
      const order: number[] = [];

      runner.add({
        priority: 50,
        pre: async () => {
          await Promise.resolve();
          order.push(50);
        },
      });
      runner.add({
        priority: 100,
        pre: async () => {
          await Promise.resolve();
          order.push(100);
        },
      });

      await runner.runPre(mockContext);

      expect(order).toEqual([50, 100]);
    });

    it('should propagate errors from pre hook', async () => {
      runner.add({
        priority: 100,
        pre: () => {
          throw new Error('Pre hook error');
        },
      });

      await expect(runner.runPre(mockContext)).rejects.toThrow('Pre hook error');
    });
  });

  // ========== runPreSync() ==========

  describe('runPreSync()', () => {
    it('should run sync pre hooks', () => {
      const order: number[] = [];

      runner.add({
        priority: 100,
        pre: () => {
          order.push(100);
        },
      });
      runner.add({
        priority: 50,
        pre: () => {
          order.push(50);
        },
      });

      runner.runPreSync(mockContext);

      expect(order).toEqual([50, 100]);
    });

    it('should throw on async pre hook', () => {
      runner.add({
        priority: 100,
        pre: async () => {
          await Promise.resolve();
        },
      });

      expect(() => { runner.runPreSync(mockContext); }).toThrow(
        'Async middleware pre() hook cannot be used with synchronous resolution',
      );
    });
  });

  // ========== runPost() ==========

  describe('runPost()', () => {
    it('should run post hooks in priority order', async () => {
      const order: number[] = [];

      runner.add({
        priority: 100,
        post: (_ctx, instance) => {
          order.push(100);

          return instance;
        },
      });
      runner.add({
        priority: 50,
        post: (_ctx, instance) => {
          order.push(50);

          return instance;
        },
      });

      await runner.runPost(mockContext, 'value');

      expect(order).toEqual([50, 100]);
    });

    it('should pass transformed instance through chain', async () => {
      runner.add({
        priority: 50,
        post: <T>(_ctx: InjectionContext, instance: T) => `[50:${String(instance)}]` as T,
      });
      runner.add({
        priority: 100,
        post: <T>(_ctx: InjectionContext, instance: T) => `[100:${String(instance)}]` as T,
      });

      const result = await runner.runPost(mockContext, 'original');

      expect(result).toBe('[100:[50:original]]');
    });

    it('should skip middlewares without post hook', async () => {
      const postFn = vi.fn((_ctx, instance) => instance);

      runner.add({ priority: 100 });
      runner.add({ priority: 50, post: postFn });

      await runner.runPost(mockContext, 'value');

      expect(postFn).toHaveBeenCalledTimes(1);
    });

    it('should handle async post hooks', async () => {
      runner.add({
        priority: 50,
        post: async <T>(_ctx: InjectionContext, instance: T) => {
          await Promise.resolve();

          return `async:${String(instance)}` as T;
        },
      });

      const result = await runner.runPost(mockContext, 'value');

      expect(result).toBe('async:value');
    });

    it('should propagate errors from post hook', async () => {
      runner.add({
        priority: 100,
        post: () => {
          throw new Error('Post hook error');
        },
      });

      await expect(runner.runPost(mockContext, 'value')).rejects.toThrow('Post hook error');
    });
  });

  // ========== runPostSync() ==========

  describe('runPostSync()', () => {
    it('should run sync post hooks', () => {
      runner.add({
        priority: 50,
        post: <T>(_ctx: InjectionContext, instance: T) => `[50:${String(instance)}]` as T,
      });
      runner.add({
        priority: 100,
        post: <T>(_ctx: InjectionContext, instance: T) => `[100:${String(instance)}]` as T,
      });

      const result = runner.runPostSync(mockContext, 'original');

      expect(result).toBe('[100:[50:original]]');
    });

    it('should throw on async post hook', () => {
      runner.add({
        priority: 100,
        post: async <T>(_ctx: InjectionContext, _instance: T) => {
          await Promise.resolve();

          return 'async' as T;
        },
      });

      expect(() => runner.runPostSync(mockContext, 'value')).toThrow(
        'Async middleware post() hook cannot be used with synchronous resolution',
      );
    });
  });

  // ========== Edge cases ==========

  describe('Edge cases', () => {
    it('should handle empty middleware runner', async () => {
      await runner.runPre(mockContext);
      const result = await runner.runPost(mockContext, 'value');

      expect(result).toBe('value');
    });

    it('should handle sync empty middleware runner', () => {
      runner.runPreSync(mockContext);
      const result = runner.runPostSync(mockContext, 'value');

      expect(result).toBe('value');
    });

    it('should handle middleware with both pre and post hooks', async () => {
      const order: string[] = [];

      runner.add({
        priority: 100,
        pre: () => {
          order.push('pre');
        },
        post: (_ctx, instance) => {
          order.push('post');

          return instance;
        },
      });

      await runner.runPre(mockContext);
      await runner.runPost(mockContext, 'value');

      expect(order).toEqual(['pre', 'post']);
    });
  });
});
