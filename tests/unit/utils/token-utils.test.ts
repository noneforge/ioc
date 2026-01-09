import { describe, expect, it } from 'vitest';

import { InjectionToken, isConstructor, isProvider, tokenToString } from '../../../src';
import { TEST_TOKEN, TestServiceA } from '../../helpers/test-fixtures';

describe('token-utils', () => {
  describe('tokenToString', () => {
    it('should convert string token to string', () => {
      const result = tokenToString('string-token');
      expect(result).toBe('string-token');
    });

    it('should convert symbol token to string', () => {
      const symbol = Symbol('test-symbol');
      const result = tokenToString(symbol);
      expect(result).toBe(symbol.toString());
    });

    it('should convert InjectionToken to string', () => {
      const token = new InjectionToken<string>('TEST_TOKEN');
      const result = tokenToString(token);
      expect(result).toBe('InjectionToken(TEST_TOKEN)');
    });

    it('should convert constructor function to string', () => {
      const result = tokenToString(TestServiceA);
      expect(result).toBe('TestServiceA');
    });

    it('should convert anonymous function to string', () => {
      const anonymousFunction = function() {};

      const result = tokenToString(anonymousFunction);
      expect(result).toBe('anonymousFunction');
    });

    it('should convert other values to string', () => {
      const result = tokenToString(123 as any);
      expect(result).toBe('123');
    });
  });

  describe('isConstructor', () => {
    it('should return true for constructor functions', () => {
      class TestClass {}
      expect(isConstructor(TestClass)).toBe(true);
    });

    it('should return true for ES5 constructor functions', () => {
      function ES5Constructor() {}

      expect(isConstructor(ES5Constructor)).toBe(true);
    });

    it('should return false for arrow functions', () => {
      const arrow = () => {};

      expect(isConstructor(arrow)).toBeFalsy();
    });

    it('should return false for regular functions without prototype.constructor', () => {
      const func = function() {};

      func.prototype = {};
      expect(isConstructor(func)).toBe(false);
    });

    it('should return false for non-functions', () => {
      expect(isConstructor('string')).toBe(false);
      expect(isConstructor(123)).toBe(false);
      expect(isConstructor({})).toBe(false);
      expect(isConstructor(null)).toBe(false);
      expect(isConstructor(undefined)).toBe(false);
    });

    it('should return false for functions without prototype', () => {
      const func = () => {};

      expect(isConstructor(func)).toBeFalsy();
    });
  });

  describe('isProvider', () => {
    it('should return true for constructor functions', () => {
      class TestClass {}
      expect(isProvider(TestClass)).toBe(true);
    });

    it('should return true for class provider objects', () => {
      const provider = {
        provide: TestServiceA,
        useClass: TestServiceA,
      };
      expect(isProvider(provider)).toBe(true);
    });

    it('should return true for value provider objects', () => {
      const provider = {
        provide: TEST_TOKEN,
        useValue: 'test-value',
      };
      expect(isProvider(provider)).toBe(true);
    });

    it('should return true for factory provider objects', () => {
      const provider = {
        provide: TEST_TOKEN,
        useFactory: () => 'test-value',
      };
      expect(isProvider(provider)).toBe(true);
    });

    it('should return true for existing provider objects', () => {
      const provider = {
        provide: 'token1',
        useExisting: 'token2',
      };
      expect(isProvider(provider)).toBe(true);
    });

    it('should return false for objects without provide property', () => {
      const obj = { useClass: TestServiceA };
      expect(isProvider(obj)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isProvider('string')).toBe(false);
      expect(isProvider(123)).toBe(false);
      expect(isProvider(true)).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isProvider(null)).toBeFalsy();
      expect(isProvider(undefined)).toBeFalsy();
    });

    it('should return false for array', () => {
      expect(isProvider([])).toBe(false);
    });

    it('should return false for arrow functions', () => {
      const arrow = () => {};

      expect(isProvider(arrow)).toBe(false);
    });
  });
});
