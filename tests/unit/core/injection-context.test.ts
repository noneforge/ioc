import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ContainerLike, InjectionContext } from '../../../src';
import { Container, InjectionContextManager, InjectionToken } from '../../../src';

// Helper to create mock injection context
function createMockContext(
  token?: unknown,
  options: Partial<InjectionContext> = {},
): InjectionContext {
  return {
    container: {
      get: () => null,
      getAsync: async () => null,
      has: () => false,
      getAll: () => [],
    } as ContainerLike,
    token: token as InjectionContext['token'],
    requestId: options.requestId,
    metadata: options.metadata ?? new Map(),
    depth: options.depth ?? 0,
    path: options.path ?? [],
    strategy: options.strategy ?? 'default',
  };
}

// Test tokens
const TOKEN_A = new InjectionToken<string>('A');
const TOKEN_B = new InjectionToken<string>('B');
const TOKEN_C = new InjectionToken<string>('C');

describe('InjectionContextManager', () => {
  // Clear the stack before and after each test
  beforeEach(() => {
    // Pop all items from the stack to ensure clean state
    while (InjectionContextManager.current() !== null) {
      InjectionContextManager.pop();
    }
  });

  afterEach(() => {
    // Clean up after each test
    while (InjectionContextManager.current() !== null) {
      InjectionContextManager.pop();
    }
  });

  // ========== current() ==========

  describe('current()', () => {
    it('should return null for empty stack', () => {
      const result = InjectionContextManager.current();

      expect(result).toBeNull();
    });

    it('should return the top context after push', () => {
      const context = createMockContext(TOKEN_A);

      InjectionContextManager.push(context);
      const result = InjectionContextManager.current();

      expect(result).toBe(context);
    });

    it('should return the most recent context', () => {
      const context1 = createMockContext(TOKEN_A);
      const context2 = createMockContext(TOKEN_B);

      InjectionContextManager.push(context1);
      InjectionContextManager.push(context2);
      const result = InjectionContextManager.current();

      expect(result).toBe(context2);
    });
  });

  // ========== push() / pop() ==========

  describe('push() / pop()', () => {
    it('should push context onto stack', () => {
      const context = createMockContext(TOKEN_A);

      InjectionContextManager.push(context);

      expect(InjectionContextManager.current()).toBe(context);
    });

    it('should pop context from stack', () => {
      const context = createMockContext(TOKEN_A);

      InjectionContextManager.push(context);
      InjectionContextManager.pop();

      expect(InjectionContextManager.current()).toBeNull();
    });

    it('should handle multiple push/pop operations', () => {
      const context1 = createMockContext(TOKEN_A);
      const context2 = createMockContext(TOKEN_B);

      InjectionContextManager.push(context1);
      InjectionContextManager.push(context2);

      expect(InjectionContextManager.current()).toBe(context2);

      InjectionContextManager.pop();
      expect(InjectionContextManager.current()).toBe(context1);

      InjectionContextManager.pop();
      expect(InjectionContextManager.current()).toBeNull();
    });

    it('should handle pop on empty stack gracefully', () => {
      // Should not throw
      expect(() => { InjectionContextManager.pop(); }).not.toThrow();
    });

    it('should maintain LIFO order', () => {
      const contexts = [
        createMockContext(TOKEN_A),
        createMockContext(TOKEN_B),
        createMockContext(TOKEN_C),
      ];

      contexts.forEach((ctx) => { InjectionContextManager.push(ctx); });

      expect(InjectionContextManager.current()).toBe(contexts[2]);
      InjectionContextManager.pop();

      expect(InjectionContextManager.current()).toBe(contexts[1]);
      InjectionContextManager.pop();

      expect(InjectionContextManager.current()).toBe(contexts[0]);
    });
  });

  // ========== run() ==========

  describe('run()', () => {
    it('should execute function with context', () => {
      const context = createMockContext(TOKEN_A);
      let capturedContext: InjectionContext | null = null;

      InjectionContextManager.run(context, () => {
        capturedContext = InjectionContextManager.current();
      });

      expect(capturedContext).toBe(context);
    });

    it('should return function result', () => {
      const context = createMockContext(TOKEN_A);

      const result = InjectionContextManager.run(context, () => 'test-result');

      expect(result).toBe('test-result');
    });

    it('should pop context after execution', () => {
      const context = createMockContext(TOKEN_A);

      InjectionContextManager.run(context, () => {
        // Context should be available here
        expect(InjectionContextManager.current()).toBe(context);
      });

      // Context should be removed after run
      expect(InjectionContextManager.current()).toBeNull();
    });

    it('should pop context even when function throws', () => {
      const context = createMockContext(TOKEN_A);

      expect(() => {
        InjectionContextManager.run(context, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Context should still be removed
      expect(InjectionContextManager.current()).toBeNull();
    });

    it('should support nested runs', () => {
      const context1 = createMockContext(TOKEN_A);
      const context2 = createMockContext(TOKEN_B);

      InjectionContextManager.run(context1, () => {
        expect(InjectionContextManager.current()).toBe(context1);

        InjectionContextManager.run(context2, () => {
          expect(InjectionContextManager.current()).toBe(context2);
        });

        // After inner run, should return to outer context
        expect(InjectionContextManager.current()).toBe(context1);
      });

      expect(InjectionContextManager.current()).toBeNull();
    });

    it('should properly restore context after nested exception', () => {
      const context1 = createMockContext(TOKEN_A);
      const context2 = createMockContext(TOKEN_B);

      InjectionContextManager.run(context1, () => {
        expect(() => {
          InjectionContextManager.run(context2, () => {
            throw new Error('Inner error');
          });
        }).toThrow('Inner error');

        // Should still have context1
        expect(InjectionContextManager.current()).toBe(context1);
      });

      expect(InjectionContextManager.current()).toBeNull();
    });
  });

  // ========== runAsync() ==========

  describe('runAsync()', () => {
    it('should execute async function with context', async () => {
      const context = createMockContext(TOKEN_A);
      let capturedContext: InjectionContext | null = null;

      await InjectionContextManager.runAsync(context, async () => {
        capturedContext = InjectionContextManager.current();
      });

      expect(capturedContext).toBe(context);
    });

    it('should return async function result', async () => {
      const context = createMockContext(TOKEN_A);

      const result = await InjectionContextManager.runAsync(context, async () => {
        return 'async-result';
      });

      expect(result).toBe('async-result');
    });

    it('should pop context after async execution', async () => {
      const context = createMockContext(TOKEN_A);

      await InjectionContextManager.runAsync(context, async () => {
        expect(InjectionContextManager.current()).toBe(context);
      });

      expect(InjectionContextManager.current()).toBeNull();
    });

    it('should pop context even when async function rejects', async () => {
      const context = createMockContext(TOKEN_A);

      await expect(
        InjectionContextManager.runAsync(context, async () => {
          throw new Error('Async error');
        }),
      ).rejects.toThrow('Async error');

      expect(InjectionContextManager.current()).toBeNull();
    });

    it('should support nested async runs', async () => {
      const context1 = createMockContext(TOKEN_A);
      const context2 = createMockContext(TOKEN_B);

      await InjectionContextManager.runAsync(context1, async () => {
        expect(InjectionContextManager.current()).toBe(context1);

        await InjectionContextManager.runAsync(context2, async () => {
          expect(InjectionContextManager.current()).toBe(context2);
        });

        expect(InjectionContextManager.current()).toBe(context1);
      });

      expect(InjectionContextManager.current()).toBeNull();
    });
  });

  // ========== getPath() ==========

  describe('getPath()', () => {
    it('should return empty string for empty stack', () => {
      const path = InjectionContextManager.getPath();

      expect(path).toBe('');
    });

    it('should return single token for one context', () => {
      const context = createMockContext(TOKEN_A);

      InjectionContextManager.push(context);
      const path = InjectionContextManager.getPath();

      expect(path).toBe('InjectionToken(A)');
    });

    it('should return arrow-separated path for multiple contexts', () => {
      const context1 = createMockContext(TOKEN_A);
      const context2 = createMockContext(TOKEN_B);
      const context3 = createMockContext(TOKEN_C);

      InjectionContextManager.push(context1);
      InjectionContextManager.push(context2);
      InjectionContextManager.push(context3);

      const path = InjectionContextManager.getPath();

      expect(path).toBe('InjectionToken(A) -> InjectionToken(B) -> InjectionToken(C)');
    });

    it('should show "unknown" for context without token', () => {
      const context = createMockContext(undefined);

      InjectionContextManager.push(context);
      const path = InjectionContextManager.getPath();

      expect(path).toBe('unknown');
    });

    it('should handle mixed contexts with and without tokens', () => {
      const context1 = createMockContext(TOKEN_A);
      const context2 = createMockContext(undefined);
      const context3 = createMockContext(TOKEN_B);

      InjectionContextManager.push(context1);
      InjectionContextManager.push(context2);
      InjectionContextManager.push(context3);

      const path = InjectionContextManager.getPath();

      expect(path).toBe('InjectionToken(A) -> unknown -> InjectionToken(B)');
    });
  });

  // ========== Edge Cases ==========

  describe('Edge Cases', () => {
    it('should handle context with class token', () => {
      class MyService {}
      const context = createMockContext(MyService);

      InjectionContextManager.push(context);

      expect(InjectionContextManager.current()).toBe(context);
      expect(InjectionContextManager.getPath()).toBe('MyService');
    });

    it('should handle context with string token', () => {
      const context = createMockContext('STRING_TOKEN');

      InjectionContextManager.push(context);

      expect(InjectionContextManager.current()).toBe(context);
      expect(InjectionContextManager.getPath()).toBe('STRING_TOKEN');
    });

    it('should handle context with symbol token', () => {
      const symToken = Symbol('SYMBOL_TOKEN');
      const context = createMockContext(symToken);

      InjectionContextManager.push(context);

      expect(InjectionContextManager.current()).toBe(context);
      // Symbol tokens are displayed as Symbol(SYMBOL_TOKEN)
      expect(InjectionContextManager.getPath()).toContain('Symbol');
    });

    it('should work with real container', () => {
      const container = new Container();
      const context: InjectionContext = {
        container,
        token: TOKEN_A,
        metadata: new Map(),
        depth: 0,
        path: [],
        strategy: 'default',
      };

      const result = InjectionContextManager.run(context, () => {
        return InjectionContextManager.current()?.container;
      });

      expect(result).toBe(container);
    });
  });
});
