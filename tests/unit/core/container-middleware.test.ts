import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InjectionContext, Middleware } from '../../../src';
import { Container, Injectable, InjectionToken } from '../../../src';

const TOKEN_A = new InjectionToken<string>('A');

@Injectable()
class TestService {
  value = 'test-service';
}

describe('Container Middleware', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(async () => {
    await container.dispose();
  });

  // ========== use() ==========

  describe('use()', () => {
    it('should add middleware to container', () => {
      const middleware: Middleware = { priority: 100 };
      container.use(middleware);
      // No error means success
    });

    it('should accept middleware with only pre hook', () => {
      container.use({
        priority: 100,
        pre: vi.fn(),
      });
    });

    it('should accept middleware with only post hook', () => {
      container.use({
        priority: 100,
        post: (_ctx, instance) => instance,
      });
    });
  });

  // ========== getMiddlewares() ==========

  describe('getMiddlewares()', () => {
    it('should return registered middlewares', () => {
      const middleware: Middleware = { priority: 100 };
      container.use(middleware);

      expect(container.getMiddlewares()).toHaveLength(1);
      expect(container.getMiddlewares()[0]).toBe(middleware);
    });
  });

  // ========== Synchronous resolution ==========

  describe('Sync resolution', () => {
    it('should run pre hook before resolution', () => {
      const preHook = vi.fn();
      container.use({ priority: 100, pre: preHook });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      container.get(TOKEN_A);

      expect(preHook).toHaveBeenCalledTimes(1);
    });

    it('should run post hook after resolution', () => {
      const postHook = vi.fn((_ctx, instance) => instance);
      container.use({ priority: 100, post: postHook });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      container.get(TOKEN_A);

      expect(postHook).toHaveBeenCalledTimes(1);
    });

    it('should pass correct context to middleware', () => {
      let capturedContext: InjectionContext | undefined;
      container.use({
        priority: 100,
        pre: (ctx) => {
          capturedContext = ctx;
        },
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      container.get(TOKEN_A);

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.token).toBe(TOKEN_A);
      expect(capturedContext?.container).toBe(container);
    });

    it('should allow post hook to transform instance', () => {
      container.use({
        priority: 100,
        post: <T>(_ctx: InjectionContext, instance: T) => `wrapped:${String(instance)}` as T,
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'original' });

      const result = container.get(TOKEN_A);

      expect(result).toBe('wrapped:original');
    });

    it('should run middlewares in priority order', () => {
      const order: number[] = [];

      container.use({
        priority: 100,
        pre: () => {
          order.push(100);
        },
      });
      container.use({
        priority: 50,
        pre: () => {
          order.push(50);
        },
      });
      container.use({
        priority: 200,
        pre: () => {
          order.push(200);
        },
      });

      container.addProvider({ provide: TOKEN_A, useValue: 'value' });
      container.get(TOKEN_A);

      expect(order).toEqual([50, 100, 200]);
    });

    it('should throw on async middleware in sync resolution', () => {
      container.use({
        priority: 100,
        pre: async () => {
          await Promise.resolve();
        },
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      expect(() => container.get(TOKEN_A)).toThrow(
        'Async middleware pre() hook cannot be used with synchronous resolution',
      );
    });

    it('should skip middleware for cached instances', () => {
      const preHook = vi.fn();
      const postHook = vi.fn((_ctx, instance) => instance);

      // Use object value - primitives are not cached (typeof check in container)
      container.use({ priority: 100, pre: preHook, post: postHook });
      container.addProvider({ provide: TOKEN_A, useValue: { data: 'value' }, scope: 'singleton' });

      // First resolution
      container.get(TOKEN_A);
      expect(preHook).toHaveBeenCalledTimes(1);
      expect(postHook).toHaveBeenCalledTimes(1);

      // Second resolution - cached, should skip middleware
      container.get(TOKEN_A);
      expect(preHook).toHaveBeenCalledTimes(1);
      expect(postHook).toHaveBeenCalledTimes(1);
    });
  });

  // ========== Async resolution ==========

  describe('Async resolution', () => {
    it('should run pre hook before async resolution', async () => {
      const preHook = vi.fn();
      container.use({ priority: 100, pre: preHook });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      await container.getAsync(TOKEN_A);

      expect(preHook).toHaveBeenCalledTimes(1);
    });

    it('should run post hook after async resolution', async () => {
      const postHook = vi.fn((_ctx, instance) => instance);
      container.use({ priority: 100, post: postHook });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      await container.getAsync(TOKEN_A);

      expect(postHook).toHaveBeenCalledTimes(1);
    });

    it('should support async middleware hooks', async () => {
      const order: string[] = [];

      container.use({
        priority: 100,
        pre: async () => {
          await Promise.resolve();
          order.push('pre');
        },
        post: async (_ctx, instance) => {
          await Promise.resolve();
          order.push('post');

          return instance;
        },
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      await container.getAsync(TOKEN_A);

      expect(order).toEqual(['pre', 'post']);
    });

    it('should allow async post hook to transform instance', async () => {
      container.use({
        priority: 100,
        post: async <T>(_ctx: InjectionContext, instance: T) => {
          await Promise.resolve();

          return `async:${String(instance)}` as T;
        },
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'original' });

      const result = await container.getAsync(TOKEN_A);

      expect(result).toBe('async:original');
    });
  });

  // ========== Error handling ==========

  describe('Error handling', () => {
    it('should propagate pre hook errors', () => {
      container.use({
        priority: 100,
        pre: () => {
          throw new Error('Pre error');
        },
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      expect(() => container.get(TOKEN_A)).toThrow('Pre error');
    });

    it('should propagate post hook errors', () => {
      container.use({
        priority: 100,
        post: () => {
          throw new Error('Post error');
        },
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      expect(() => container.get(TOKEN_A)).toThrow('Post error');
    });

    it('should propagate async pre hook errors', async () => {
      container.use({
        priority: 100,
        pre: async () => {
          await Promise.resolve();

          throw new Error('Async pre error');
        },
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      await expect(container.getAsync(TOKEN_A)).rejects.toThrow('Async pre error');
    });

    it('should propagate async post hook errors', async () => {
      container.use({
        priority: 100,
        post: async () => {
          await Promise.resolve();

          throw new Error('Async post error');
        },
      });
      container.addProvider({ provide: TOKEN_A, useValue: 'value' });

      await expect(container.getAsync(TOKEN_A)).rejects.toThrow('Async post error');
    });
  });

  // ========== Child containers ==========

  describe('Child containers', () => {
    it('should inherit parent middlewares', () => {
      const preHook = vi.fn();
      container.use({ priority: 100, pre: preHook });

      const child = container.createChild([{ provide: TOKEN_A, useValue: 'child-value' }]);

      child.get(TOKEN_A);

      expect(preHook).toHaveBeenCalledTimes(1);
    });

    it('should allow child to add own middleware', () => {
      const parentPre = vi.fn();
      const childPre = vi.fn();

      container.use({ priority: 100, pre: parentPre });

      const child = container.createChild([{ provide: TOKEN_A, useValue: 'value' }]);
      child.use({ priority: 50, pre: childPre });

      child.get(TOKEN_A);

      expect(parentPre).toHaveBeenCalledTimes(1);
      expect(childPre).toHaveBeenCalledTimes(1);
    });

    it('should not affect parent when child adds middleware', () => {
      const childPre = vi.fn();

      container.addProvider({ provide: TOKEN_A, useValue: 'parent-value' });
      const child = container.createChild();
      child.use({ priority: 100, pre: childPre });

      // Resolve from parent
      container.get(TOKEN_A);

      expect(childPre).not.toHaveBeenCalled();
    });
  });

  // ========== Integration with classes ==========

  describe('Class providers', () => {
    it('should run middleware for class providers', () => {
      const postHook = vi.fn((_ctx, instance) => instance);
      container.use({ priority: 100, post: postHook });
      container.addProvider(TestService);

      const instance = container.get(TestService);

      expect(postHook).toHaveBeenCalledTimes(1);
      expect(instance).toBeInstanceOf(TestService);
    });

    it('should run middleware for nested dependency resolution', () => {
      const preHook = vi.fn();
      container.use({ priority: 100, pre: preHook });

      // Use factory provider with explicit dependencies for reliable test
      const DEP_TOKEN = new InjectionToken<string>('dep');
      const MAIN_TOKEN = new InjectionToken<{ dep: string }>('main');

      container.addProvider({ provide: DEP_TOKEN, useValue: { value: 'dep' } });
      container.addProvider({
        provide: MAIN_TOKEN,
        useFactory: (dep: string) => ({ dep }),
        inject: [DEP_TOKEN],
      });

      container.get(MAIN_TOKEN);

      // Called for both MAIN_TOKEN and DEP_TOKEN
      expect(preHook).toHaveBeenCalledTimes(2);
    });
  });

  // ========== Transient scope ==========

  describe('Transient scope', () => {
    it('should run middleware on each transient resolution', () => {
      const postHook = vi.fn((_ctx, instance) => instance);
      container.use({ priority: 100, post: postHook });
      container.addProvider({ provide: TOKEN_A, useValue: 'value', scope: 'transient' });

      container.get(TOKEN_A);
      container.get(TOKEN_A);
      container.get(TOKEN_A);

      expect(postHook).toHaveBeenCalledTimes(3);
    });
  });
});
