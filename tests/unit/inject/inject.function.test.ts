import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContainerLike, InjectionContext, InjectOptions } from '../../../src';
import {
  Container,
  inject,
  injectAll,
  InjectionContextManager,
  InjectionToken,
  injectLazy,
  injectOptional,
} from '../../../src';
import { forwardRef } from '../../../src';

// Test tokens
const TOKEN_A = new InjectionToken<string>('A');
const TOKEN_B = new InjectionToken<number>('B');
const TOKEN_MULTI = new InjectionToken<string>('MULTI');

// Helper to create mock container (cast to bypass strict generic checking)
function createMockContainer(overrides: Record<string, unknown> = {}): ContainerLike {
  return {
    get: vi.fn(() => null),
    getAsync: vi.fn(async () => null),
    has: vi.fn(() => false),
    getAll: vi.fn(() => []),
    ...overrides,
  } as ContainerLike;
}

// Helper to create mock injection context
function createMockContext(container: ContainerLike, token?: unknown): InjectionContext {
  return {
    container,
    token: token as InjectionContext['token'],
    requestId: 'test-request-id',
    metadata: new Map(),
    depth: 0,
    path: [],
    strategy: 'default',
  };
}

describe('inject()', () => {
  // ========== Basic inject() ==========

  describe('basic inject()', () => {
    it('should throw when called outside injection context', () => {
      expect(() => inject(TOKEN_A)).toThrow('inject() must be called from an injection context');
    });

    it('should call container.get with token', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => 'resolved-value'),
      });
      const context = createMockContext(mockContainer, TOKEN_A);

      const result = InjectionContextManager.run(context, () => inject(TOKEN_A));

      expect(result).toBe('resolved-value');
      expect(mockContainer.get).toHaveBeenCalledWith(TOKEN_A, expect.objectContaining({
        requestId: 'test-request-id',
      }));
    });

    it('should resolve forward ref', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => 'forward-resolved'),
      });
      const context = createMockContext(mockContainer);
      const forwardToken = forwardRef(() => TOKEN_A);

      const result = InjectionContextManager.run(context, () => inject(forwardToken));

      expect(result).toBe('forward-resolved');
      expect(mockContainer.get).toHaveBeenCalledWith(TOKEN_A, expect.any(Object));
    });

    it('should pass requestId from context', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => 'value'),
      });
      const context = createMockContext(mockContainer);
      context.requestId = 'custom-request-id';

      InjectionContextManager.run(context, () => inject(TOKEN_A));

      expect(mockContainer.get).toHaveBeenCalledWith(
        TOKEN_A,
        expect.objectContaining({ requestId: 'custom-request-id' }),
      );
    });
  });

  // ========== inject() with options ==========

  describe('inject() with options', () => {
    it('should pass optional option to container', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => null),
      });
      const context = createMockContext(mockContainer);

      InjectionContextManager.run(context, () => inject(TOKEN_A, { optional: true }));

      expect(mockContainer.get).toHaveBeenCalledWith(
        TOKEN_A,
        expect.objectContaining({ optional: true }),
      );
    });

    it('should pass lazy option to container', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => ({ value: 'lazy' })),
      });
      const context = createMockContext(mockContainer);

      InjectionContextManager.run(context, () => inject(TOKEN_A, { lazy: true }));

      expect(mockContainer.get).toHaveBeenCalledWith(
        TOKEN_A,
        expect.objectContaining({ lazy: true }),
      );
    });

    it('should pass skipSelf option to container', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => 'value'),
      });
      const context = createMockContext(mockContainer);

      // Cast to bypass strict overload matching
      InjectionContextManager.run(context, () => (inject as (t: unknown, o: InjectOptions) => unknown)(TOKEN_A, { skipSelf: true }));

      expect(mockContainer.get).toHaveBeenCalledWith(
        TOKEN_A,
        expect.objectContaining({ skipSelf: true }),
      );
    });

    it('should pass self option to container', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => 'value'),
      });
      const context = createMockContext(mockContainer);

      // Cast to bypass strict overload matching
      InjectionContextManager.run(context, () => (inject as (t: unknown, o: InjectOptions) => unknown)(TOKEN_A, { self: true }));

      expect(mockContainer.get).toHaveBeenCalledWith(
        TOKEN_A,
        expect.objectContaining({ self: true }),
      );
    });

    it('should handle multi option specially', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => ['a', 'b', 'c']),
      });
      const context = createMockContext(mockContainer);

      const result = InjectionContextManager.run(context, () =>
        inject(TOKEN_MULTI, { multi: true }),
      );

      expect(result).toEqual(['a', 'b', 'c']);
      // Multi option should just call get (getAll is handled differently)
      expect(mockContainer.get).toHaveBeenCalledWith(TOKEN_MULTI);
    });
  });

  // ========== inject() with combined options ==========

  describe('inject() with combined options', () => {
    it('should combine optional and lazy options', () => {
      const mockContainer = createMockContainer({
        get: vi.fn(() => null),
      });
      const context = createMockContext(mockContainer);

      InjectionContextManager.run(context, () =>
        inject(TOKEN_A, { optional: true, lazy: true }),
      );

      expect(mockContainer.get).toHaveBeenCalledWith(
        TOKEN_A,
        expect.objectContaining({ optional: true, lazy: true }),
      );
    });
  });
});

describe('injectLazy()', () => {
  it('should throw when called outside injection context', () => {
    expect(() => injectLazy(TOKEN_A)).toThrow('inject() must be called from an injection context');
  });

  it('should call inject with lazy: true', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => ({ lazyValue: 'test' })),
    });
    const context = createMockContext(mockContainer);

    const result = InjectionContextManager.run(context, () => injectLazy(TOKEN_A));

    expect(result).toEqual({ lazyValue: 'test' });
    expect(mockContainer.get).toHaveBeenCalledWith(
      TOKEN_A,
      expect.objectContaining({ lazy: true }),
    );
  });

  it('should pass other options along with lazy', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => ({ lazyValue: 'test' })),
    });
    const context = createMockContext(mockContainer);

    InjectionContextManager.run(context, () => injectLazy(TOKEN_A, { optional: true }));

    expect(mockContainer.get).toHaveBeenCalledWith(
      TOKEN_A,
      expect.objectContaining({ lazy: true, optional: true }),
    );
  });

  it('should resolve forward ref', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => ({ lazyValue: 'forward' })),
    });
    const context = createMockContext(mockContainer);
    const forwardToken = forwardRef(() => TOKEN_A);

    InjectionContextManager.run(context, () => injectLazy(forwardToken));

    expect(mockContainer.get).toHaveBeenCalledWith(TOKEN_A, expect.any(Object));
  });
});

describe('injectAll()', () => {
  it('should throw when called outside injection context', () => {
    expect(() => injectAll(TOKEN_MULTI)).toThrow(
      'inject() must be called from an injection context',
    );
  });

  it('should call inject with multi: true', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => ['value1', 'value2', 'value3']),
    });
    const context = createMockContext(mockContainer);

    const result = InjectionContextManager.run(context, () => injectAll(TOKEN_MULTI));

    expect(result).toEqual(['value1', 'value2', 'value3']);
    expect(mockContainer.get).toHaveBeenCalledWith(TOKEN_MULTI);
  });

  it('should return empty array when no providers', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => []),
    });
    const context = createMockContext(mockContainer);

    const result = InjectionContextManager.run(context, () => injectAll(TOKEN_MULTI));

    expect(result).toEqual([]);
  });

  it('should resolve forward ref', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => ['a', 'b']),
    });
    const context = createMockContext(mockContainer);
    const forwardToken = forwardRef(() => TOKEN_MULTI);

    const result = InjectionContextManager.run(context, () => injectAll(forwardToken));

    expect(result).toEqual(['a', 'b']);
    expect(mockContainer.get).toHaveBeenCalledWith(TOKEN_MULTI);
  });
});

describe('injectOptional()', () => {
  it('should throw when called outside injection context', () => {
    expect(() => injectOptional(TOKEN_A)).toThrow(
      'inject() must be called from an injection context',
    );
  });

  it('should call inject with optional: true', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => 'optional-value'),
    });
    const context = createMockContext(mockContainer);

    const result = InjectionContextManager.run(context, () => injectOptional(TOKEN_A));

    expect(result).toBe('optional-value');
    expect(mockContainer.get).toHaveBeenCalledWith(
      TOKEN_A,
      expect.objectContaining({ optional: true }),
    );
  });

  it('should return null when not found', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => null),
    });
    const context = createMockContext(mockContainer);

    const result = InjectionContextManager.run(context, () => injectOptional(TOKEN_A));

    expect(result).toBeNull();
  });

  it('should pass other options along with optional', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => 'value'),
    });
    const context = createMockContext(mockContainer);

    InjectionContextManager.run(context, () =>
      injectOptional(TOKEN_A, { skipSelf: true }),
    );

    expect(mockContainer.get).toHaveBeenCalledWith(
      TOKEN_A,
      expect.objectContaining({ optional: true, skipSelf: true }),
    );
  });

  it('should resolve forward ref', () => {
    const mockContainer = createMockContainer({
      get: vi.fn(() => 'forward-value'),
    });
    const context = createMockContext(mockContainer);
    const forwardToken = forwardRef(() => TOKEN_A);

    const result = InjectionContextManager.run(context, () => injectOptional(forwardToken));

    expect(result).toBe('forward-value');
    expect(mockContainer.get).toHaveBeenCalledWith(TOKEN_A, expect.any(Object));
  });
});

// ========== Integration Tests ==========

describe('Integration with real Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should inject registered value', () => {
    container.addProvider({ provide: TOKEN_A, useValue: 'test-value' });

    const context: InjectionContext = {
      container,
      token: TOKEN_A,
      metadata: new Map(),
      depth: 0,
      path: [],
      strategy: 'default',
    };

    const result = InjectionContextManager.run(context, () => inject(TOKEN_A));

    expect(result).toBe('test-value');
  });

  it('should inject optional and return null when not registered', () => {
    const context: InjectionContext = {
      container,
      token: undefined,
      metadata: new Map(),
      depth: 0,
      path: [],
      strategy: 'default',
    };

    const result = InjectionContextManager.run(context, () => injectOptional(TOKEN_B));

    expect(result).toBeNull();
  });

  it('should throw for non-optional when not registered', () => {
    const context: InjectionContext = {
      container,
      token: undefined,
      metadata: new Map(),
      depth: 0,
      path: [],
      strategy: 'default',
    };

    expect(() => {
      InjectionContextManager.run(context, () => inject(TOKEN_B));
    }).toThrow();
  });
});
