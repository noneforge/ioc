import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InjectionContextManager, InjectionError } from '../../../src';
import { TEST_TOKEN, TestServiceA } from '../../helpers/test-fixtures';

// Concrete implementation for testing
class TestInjectionError extends InjectionError {
  constructor(message: string, context?: any, cause?: Error) {
    super(message, context, cause);
  }
}

describe('InjectionError', () => {
  beforeEach(() => {
    // Reset context manager
    vi.clearAllMocks();
  });

  describe('Basic error creation', () => {
    it('should create error with basic message', () => {
      const error = new TestInjectionError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InjectionError);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('TestInjectionError');
    });

    it('should preserve constructor name', () => {
      const error = new TestInjectionError('Test message');
      expect(error.name).toBe('TestInjectionError');
    });

    it('should have undefined context and cause by default', () => {
      const error = new TestInjectionError('Test message');

      expect(error.context).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });
  });

  describe('Context handling', () => {
    it('should include context information in message', () => {
      const context = {
        token: TestServiceA,
        container: undefined as any,
        scope: 'singleton' as any,
      };

      const error = new TestInjectionError('Test error', context);

      expect(error.context).toBe(context);
      expect(error.message).toContain('Resolution path: TestServiceA');
    });

    it('should include context with token string', () => {
      const context = {
        token: 'string-token',
        container: undefined as any,
        scope: 'singleton' as any,
      };

      const error = new TestInjectionError('Test error', context);

      expect(error.message).toContain('Resolution path: string-token');
    });

    it('should include context with InjectionToken', () => {
      const context = {
        token: TEST_TOKEN,
        container: undefined as any,
        scope: 'singleton' as any,
      };

      const error = new TestInjectionError('Test error', context);

      expect(error.message).toContain('Resolution path: InjectionToken(TEST_TOKEN)');
    });

    it('should handle context without token', () => {
      const context = {
        token: undefined as any,
        container: undefined as any,
        scope: 'singleton' as any,
      };

      const error = new TestInjectionError('Test error', context);

      expect(error.message).toContain('Resolution path: unknown');
    });

    it('should include full resolution path when available', () => {
      vi.spyOn(InjectionContextManager, 'getPath').mockReturnValue('ServiceA -> ServiceB');

      const context = {
        token: 'ServiceC',
        container: undefined as any,
        scope: 'singleton' as any,
      };

      const error = new TestInjectionError('Test error', context);

      expect(error.message).toContain('Resolution path: ServiceA -> ServiceB -> ServiceC');
    });

    it('should handle empty resolution path', () => {
      vi.spyOn(InjectionContextManager, 'getPath').mockReturnValue('');

      const context = {
        token: 'ServiceA',
        container: undefined as any,
        scope: 'singleton' as any,
      };

      const error = new TestInjectionError('Test error', context);

      expect(error.message).toContain('Resolution path: ServiceA');
    });
  });

  describe('Cause handling', () => {
    it('should include cause error information', () => {
      const cause = new Error('Original error');
      const error = new TestInjectionError('Test error', undefined, cause);

      expect(error.cause).toBe(cause);
      expect(error.message).toContain('Caused by: Original error');
    });

    it('should handle both context and cause', () => {
      const context = {
        token: TestServiceA,
        container: undefined as any,
        scope: 'singleton' as any,
      };
      const cause = new Error('Original error');

      const error = new TestInjectionError('Test error', context, cause);

      expect(error.context).toBe(context);
      expect(error.cause).toBe(cause);
      expect(error.message).toContain('Resolution path: TestServiceA');
      expect(error.message).toContain('Caused by: Original error');
    });

    it('should handle nested InjectionError as cause', () => {
      const innerError = new TestInjectionError('Inner error');
      const outerError = new TestInjectionError('Outer error', undefined, innerError);

      expect(outerError.cause).toBe(innerError);
      expect(outerError.message).toContain('Caused by: Inner error');
    });
  });

  describe('Error properties', () => {
    it('should have correct error properties', () => {
      const error = new TestInjectionError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.name).toBe('TestInjectionError');
      expect(error.stack).toBeDefined();
    });

    it('should be catchable as Error', () => {
      try {
        throw new TestInjectionError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(InjectionError);
        expect(error).toBeInstanceOf(TestInjectionError);
      }
    });

    it('should maintain prototype chain', () => {
      const error = new TestInjectionError('Test message');

      expect(Object.getPrototypeOf(error)).toBe(TestInjectionError.prototype);
      expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(InjectionError.prototype);
      expect(Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(error)))).toBe(Error.prototype);
    });
  });

  describe('Message formatting', () => {
    it('should format message with all components', () => {
      vi.spyOn(InjectionContextManager, 'getPath').mockReturnValue('ServiceA -> ServiceB');

      const context = {
        token: TestServiceA,
        container: undefined as any,
        scope: 'singleton' as any,
      };
      const cause = new Error('Dependency not found');

      const error = new TestInjectionError('Failed to resolve dependency', context, cause);

      const expectedMessage = 'Failed to resolve dependency\n'
        + 'Resolution path: ServiceA -> ServiceB -> TestServiceA\n'
        + 'Caused by: Dependency not found';

      expect(error.message).toBe(expectedMessage);
    });

    it('should format message with only context', () => {
      vi.spyOn(InjectionContextManager, 'getPath').mockReturnValue('');

      const context = {
        token: 'MyService',
        container: undefined as any,
        scope: 'singleton' as any,
      };

      const error = new TestInjectionError('Service not found', context);

      expect(error.message).toBe('Service not found\nResolution path: MyService');
    });

    it('should format message with only cause', () => {
      const cause = new Error('Network timeout');
      const error = new TestInjectionError('Request failed', undefined, cause);

      expect(error.message).toBe('Request failed\nCaused by: Network timeout');
    });
  });
});
