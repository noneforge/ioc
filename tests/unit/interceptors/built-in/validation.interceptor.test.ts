import { describe, expect, it, vi } from 'vitest';

import type { ContainerLike, InjectionContext } from '../../../../src';
import { InjectionToken, ValidationError, ValidationInterceptor } from '../../../../src';

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

describe('ValidationInterceptor', () => {
  // ========== Constructor ==========

  describe('constructor', () => {
    it('should create with validator function', () => {
      const interceptor = new ValidationInterceptor(() => true);
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => 'value');

      expect(result).toBe('value');
    });

    it('should accept custom error message', () => {
      const customMessage = 'Custom validation error';
      const interceptor = new ValidationInterceptor(() => false, customMessage);
      const context = createMockContext(TOKEN_A);

      expect(() => {
        interceptor.intercept(context, () => 'value');
      }).toThrow(customMessage);
    });
  });

  // ========== Sync intercept() ==========

  describe('intercept() sync', () => {
    it('should pass valid value through', () => {
      const interceptor = new ValidationInterceptor((value) => value === 'valid');
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => 'valid');

      expect(result).toBe('valid');
    });

    it('should throw ValidationError for invalid value', () => {
      const interceptor = new ValidationInterceptor((value) => value === 'valid');
      const context = createMockContext(TOKEN_A);

      expect(() => {
        interceptor.intercept(context, () => 'invalid');
      }).toThrow(ValidationError);
    });

    it('should include value in ValidationError', () => {
      const interceptor = new ValidationInterceptor(() => false);
      const context = createMockContext(TOKEN_A);

      try {
        interceptor.intercept(context, () => 'test-value');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).value).toBe('test-value');
      }
    });

    it('should include token in ValidationError', () => {
      const interceptor = new ValidationInterceptor(() => false);
      const context = createMockContext(TOKEN_A);

      try {
        interceptor.intercept(context, () => 'value');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).token).toBe(TOKEN_A);
      }
    });

    it('should include context in ValidationError', () => {
      const interceptor = new ValidationInterceptor(() => false);
      const context = createMockContext(TOKEN_A);

      try {
        interceptor.intercept(context, () => 'value');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).context).toBe(context);
      }
    });

    it('should validate null values', () => {
      const interceptor = new ValidationInterceptor((value) => value !== null);
      const context = createMockContext(TOKEN_A);

      expect(() => {
        interceptor.intercept(context, () => null);
      }).toThrow(ValidationError);
    });

    it('should validate undefined values', () => {
      const interceptor = new ValidationInterceptor((value) => value !== undefined);
      const context = createMockContext(TOKEN_A);

      expect(() => {
        interceptor.intercept(context, () => undefined);
      }).toThrow(ValidationError);
    });

    it('should validate object shape', () => {
      interface User {
        name: string;
        age: number;
      }

      const isValidUser = (value: unknown): boolean => {
        if (typeof value !== 'object' || value === null) {return false;}

        const user = value as Record<string, unknown>;

        return typeof user.name === 'string' && typeof user.age === 'number';
      };

      const interceptor = new ValidationInterceptor(isValidUser);
      const context = createMockContext(TOKEN_A);

      const validUser: User = { name: 'John', age: 30 };
      const result = interceptor.intercept(context, () => validUser);
      expect(result).toBe(validUser);

      expect(() => {
        interceptor.intercept(context, () => ({ name: 'John' })); // Missing age
      }).toThrow(ValidationError);
    });

    it('should call validator exactly once per intercept', () => {
      const validator = vi.fn(() => true);
      const interceptor = new ValidationInterceptor(validator);
      const context = createMockContext(TOKEN_A);

      interceptor.intercept(context, () => 'value');

      expect(validator).toHaveBeenCalledTimes(1);
      expect(validator).toHaveBeenCalledWith('value');
    });
  });

  // ========== Async intercept() ==========

  describe('intercept() async', () => {
    it('should pass valid async value through', async () => {
      const interceptor = new ValidationInterceptor((value) => value === 'valid');
      const context = createMockContext(TOKEN_A);

      const result = await interceptor.intercept(context, async () => 'valid');

      expect(result).toBe('valid');
    });

    it('should throw ValidationError for invalid async value', async () => {
      const interceptor = new ValidationInterceptor((value) => value === 'valid');
      const context = createMockContext(TOKEN_A);

      await expect(
        interceptor.intercept(context, async () => 'invalid'),
      ).rejects.toThrow(ValidationError);
    });

    it('should validate after promise resolves', async () => {
      const validator = vi.fn(() => true);
      const interceptor = new ValidationInterceptor(validator);
      const context = createMockContext(TOKEN_A);

      await interceptor.intercept(context, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));

        return 'delayed-value';
      });

      expect(validator).toHaveBeenCalledWith('delayed-value');
    });

    it('should propagate factory rejections before validation', async () => {
      const validator = vi.fn(() => true);
      const interceptor = new ValidationInterceptor(validator);
      const context = createMockContext(TOKEN_A);

      await expect(
        interceptor.intercept(context, async () => {
          throw new Error('Factory error');
        }),
      ).rejects.toThrow('Factory error');

      expect(validator).not.toHaveBeenCalled();
    });
  });

  // ========== Edge Cases ==========

  describe('Edge Cases', () => {
    it('should handle undefined token in context', () => {
      const interceptor = new ValidationInterceptor(() => false);
      const context = createMockContext(undefined);

      expect(() => {
        interceptor.intercept(context, () => 'value');
      }).toThrow(ValidationError);
    });

    it('should handle class token', () => {
      class MyService {}
      const interceptor = new ValidationInterceptor((value) => value instanceof MyService);
      const context = createMockContext(MyService);

      const instance = new MyService();
      const result = interceptor.intercept(context, () => instance);
      expect(result).toBe(instance);

      expect(() => {
        interceptor.intercept(context, () => ({}));
      }).toThrow(ValidationError);
    });

    it('should handle validator throwing error', () => {
      const interceptor = new ValidationInterceptor(() => {
        throw new Error('Validator crashed');
      });
      const context = createMockContext(TOKEN_A);

      expect(() => {
        interceptor.intercept(context, () => 'value');
      }).toThrow('Validator crashed');
    });

    it('should validate arrays', () => {
      const interceptor = new ValidationInterceptor(
        (value) => Array.isArray(value) && value.length > 0,
      );
      const context = createMockContext(TOKEN_A);

      const result = interceptor.intercept(context, () => [1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);

      expect(() => {
        interceptor.intercept(context, () => []);
      }).toThrow(ValidationError);
    });

    it('should handle complex validation logic', () => {
      const interceptor = new ValidationInterceptor((value) => {
        if (typeof value !== 'number') {return false;}

        if (value < 0) {return false;}

        if (value > 100) {return false;}

        return Number.isInteger(value);
      });
      const context = createMockContext(TOKEN_A);

      expect(interceptor.intercept(context, () => 50)).toBe(50);
      expect(interceptor.intercept(context, () => 0)).toBe(0);
      expect(interceptor.intercept(context, () => 100)).toBe(100);

      expect(() => interceptor.intercept(context, () => -1)).toThrow(ValidationError);
      expect(() => interceptor.intercept(context, () => 101)).toThrow(ValidationError);
      expect(() => interceptor.intercept(context, () => 50.5)).toThrow(ValidationError);
      expect(() => interceptor.intercept(context, () => 'fifty')).toThrow(ValidationError);
    });
  });
});
