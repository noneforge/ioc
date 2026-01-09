import { describe, expect, it } from 'vitest';

import { InjectionToken } from '../../../src';

describe('InjectionToken', () => {
  describe('Basic functionality', () => {
    it('should create a token with description', () => {
      const token = new InjectionToken<string>('TEST_TOKEN');

      expect(token).toBeInstanceOf(InjectionToken);
      expect(token.toString()).toBe('InjectionToken(TEST_TOKEN)');
    });

    it('should create token with options', () => {
      const factory = () => 'default-value';
      const token = new InjectionToken<string>('TOKEN_WITH_OPTIONS', {
        providedIn: 'root',
        factory,
        multi: true,
        scope: 'singleton',
      });

      expect(token.options?.providedIn).toBe('root');
      expect(token.options?.factory).toBe(factory);
      expect(token.options?.multi).toBe(true);
      expect(token.options?.scope).toBe('singleton');
    });

    it('should handle token without options', () => {
      const token = new InjectionToken<number>('SIMPLE_TOKEN');

      expect(token.options).toBeUndefined();
    });
  });

  describe('toString', () => {
    it('should format token name correctly', () => {
      const token = new InjectionToken('MY_CONSTANT');
      expect(token.toString()).toBe('InjectionToken(MY_CONSTANT)');
    });

    it('should handle empty description', () => {
      const token = new InjectionToken('');
      expect(token.toString()).toBe('InjectionToken()');
    });

    it('should handle special characters in description', () => {
      const token = new InjectionToken('API_URL@production:8080');
      expect(token.toString()).toBe('InjectionToken(API_URL@production:8080)');
    });

    it('should handle unicode characters', () => {
      const token = new InjectionToken('🔑_SECRET_KEY');
      expect(token.toString()).toBe('InjectionToken(🔑_SECRET_KEY)');
    });
  });

  describe('Validation', () => {
    it('should return true by default when no validator', () => {
      const token = new InjectionToken<string>('NO_VALIDATOR');

      expect(token.validate('any-value')).toBe(true);
      expect(token.validate(null)).toBe(true);
      expect(token.validate(undefined)).toBe(true);
    });

    it('should use custom validator when provided', () => {
      const validator = (value: any) => typeof value === 'string' && value.length > 0;
      const token = new InjectionToken<string>('STRING_TOKEN', { validator });

      expect(token.validate('valid-string')).toBe(true);
      expect(token.validate('')).toBe(false);
      expect(token.validate(null)).toBe(false);
      expect(token.validate(123)).toBe(false);
    });

    it('should handle complex validation logic', () => {
      const validator = (value: any) => {
        return typeof value === 'object' && value !== null && 'id' in value;
      };

      const token = new InjectionToken<{ id: number }>('ENTITY_TOKEN', { validator });

      expect(token.validate({ id: 1, name: 'test' })).toBe(true);
      expect(token.validate({ name: 'test' })).toBe(false);
      expect(token.validate(null)).toBe(false);
      expect(token.validate('string')).toBe(false);
    });

    it('should handle validator that throws', () => {
      const validator = () => { throw new Error('Validation error'); };

      const token = new InjectionToken<any>('THROWING_VALIDATOR', { validator });

      expect(() => token.validate('any-value')).toThrow('Validation error');
    });
  });

  describe('Transformation', () => {
    it('should return value as-is when no transformer', () => {
      const token = new InjectionToken<string>('NO_TRANSFORMER');
      const value = 'test-value';

      expect(token.transform(value)).toBe(value);
    });

    it('should apply transformer when provided', () => {
      const transformer = (value: string) => value.toUpperCase();
      const token = new InjectionToken<string>('UPPERCASE_TOKEN', { transformer });

      expect(token.transform('hello world')).toBe('HELLO WORLD');
    });

    it('should handle type transformation', () => {
      const transformer = (value: string) => parseInt(value, 10);
      const token = new InjectionToken<number>('STRING_TO_NUMBER', { transformer });

      expect(token.transform('42')).toBe(42);
      expect(token.transform('123')).toBe(123);
    });

    it('should handle complex transformation', () => {
      const transformer = (value: string) => {
        const [name, age] = value.split(':');

        return { name, age: parseInt(age, 10) };
      };

      const token = new InjectionToken<{ name: string; age: number }>('PERSON_TOKEN', {
        transformer,
      });

      const result = token.transform('John:25');
      expect(result).toEqual({ name: 'John', age: 25 });
    });

    it('should handle transformer that throws', () => {
      const transformer = () => { throw new Error('Transform error'); };

      const token = new InjectionToken<any>('THROWING_TRANSFORMER', { transformer });

      expect(() => token.transform('any-value')).toThrow('Transform error');
    });
  });

  describe('Options handling', () => {
    it('should handle all providedIn values', () => {
      const rootToken = new InjectionToken('ROOT_TOKEN', { providedIn: 'root' });
      const platformToken = new InjectionToken('PLATFORM_TOKEN', { providedIn: 'platform' });
      const anyToken = new InjectionToken('ANY_TOKEN', { providedIn: 'any' });
      const nullToken = new InjectionToken('NULL_TOKEN', { providedIn: null });

      expect(rootToken.options?.providedIn).toBe('root');
      expect(platformToken.options?.providedIn).toBe('platform');
      expect(anyToken.options?.providedIn).toBe('any');
      expect(nullToken.options?.providedIn).toBeNull();
    });

    it('should handle factory option', () => {
      const factory = () => ({ message: 'Hello World' });
      const token = new InjectionToken<{ message: string }>('FACTORY_TOKEN', { factory });

      expect(token.options?.factory).toBe(factory);
      expect(token.options?.factory?.()).toEqual({ message: 'Hello World' });
    });

    it('should handle multi option', () => {
      const multiToken = new InjectionToken('MULTI_TOKEN', { multi: true });
      const singleToken = new InjectionToken('SINGLE_TOKEN', { multi: false });
      const defaultToken = new InjectionToken('DEFAULT_TOKEN');

      expect(multiToken.options?.multi).toBe(true);
      expect(singleToken.options?.multi).toBe(false);
      expect(defaultToken.options?.multi).toBeUndefined();
    });

    it('should handle scope option', () => {
      const singletonToken = new InjectionToken('SINGLETON_TOKEN', { scope: 'singleton' });
      const transientToken = new InjectionToken('TRANSIENT_TOKEN', { scope: 'transient' });
      const requestToken = new InjectionToken('REQUEST_TOKEN', { scope: 'request' });

      expect(singletonToken.options?.scope).toBe('singleton');
      expect(transientToken.options?.scope).toBe('transient');
      expect(requestToken.options?.scope).toBe('request');
    });

    it('should handle combined options', () => {
      const validator = (value: any) => typeof value === 'string';
      const transformer = (value: string) => value.trim();
      const factory = () => 'default';

      const token = new InjectionToken<string>('COMPLEX_TOKEN', {
        providedIn: 'root',
        factory,
        multi: true,
        scope: 'singleton',
        validator,
        transformer,
      });

      expect(token.options?.providedIn).toBe('root');
      expect(token.options?.factory).toBe(factory);
      expect(token.options?.multi).toBe(true);
      expect(token.options?.scope).toBe('singleton');
      expect(token.options?.validator).toBe(validator);
      expect(token.options?.transformer).toBe(transformer);
    });
  });

  describe('Token identity', () => {
    it('should maintain unique identity', () => {
      const token1 = new InjectionToken<string>('SAME_NAME');
      const token2 = new InjectionToken<string>('SAME_NAME');

      expect(token1).not.toBe(token2);
      expect(token1 === token2).toBe(false);
    });

    it('should be comparable by reference', () => {
      const token = new InjectionToken<string>('REF_TOKEN');
      const sameToken = token;

      expect(token === sameToken).toBe(true);
      expect(token).toBe(sameToken);
    });

    it('should work as Map keys', () => {
      const token1 = new InjectionToken<string>('KEY1');
      const token2 = new InjectionToken<string>('KEY2');

      const map = new Map();
      map.set(token1, 'value1');
      map.set(token2, 'value2');

      expect(map.get(token1)).toBe('value1');
      expect(map.get(token2)).toBe('value2');
      expect(map.has(token1)).toBe(true);
      expect(map.has(token2)).toBe(true);
    });

    it('should work as Set values', () => {
      const token1 = new InjectionToken<string>('SET1');
      const token2 = new InjectionToken<string>('SET2');

      const set = new Set([token1, token2]);

      expect(set.has(token1)).toBe(true);
      expect(set.has(token2)).toBe(true);
      expect(set.size).toBe(2);
    });
  });

  describe('Type safety', () => {
    it('should maintain type information', () => {
      const stringToken = new InjectionToken<string>('STRING_TOKEN');
      const numberToken = new InjectionToken<number>('NUMBER_TOKEN');
      const objectToken = new InjectionToken<{ id: number; name: string }>('OBJECT_TOKEN');

      // TypeScript compiler should enforce correct types
      // These are compile-time checks, but we can verify runtime behavior
      expect(stringToken.toString()).toContain('STRING_TOKEN');
      expect(numberToken.toString()).toContain('NUMBER_TOKEN');
      expect(objectToken.toString()).toContain('OBJECT_TOKEN');
    });

    it('should handle generic type parameters', () => {
      interface User {
        id: number;
        email: string;
      }

      const userToken = new InjectionToken<User>('USER_TOKEN');
      const userArrayToken = new InjectionToken<User[]>('USER_ARRAY_TOKEN');

      expect(userToken.toString()).toBe('InjectionToken(USER_TOKEN)');
      expect(userArrayToken.toString()).toBe('InjectionToken(USER_ARRAY_TOKEN)');
    });
  });
});
