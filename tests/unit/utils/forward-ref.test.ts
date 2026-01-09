import { describe, expect, it } from 'vitest';

import { forwardRef, isForwardRef, resolveForwardRef } from '../../../src/utils/forward-ref';
import { TEST_TOKEN, TestServiceA } from '../../helpers/test-fixtures';

describe('forward-ref', () => {
  describe('forwardRef', () => {
    it('should create a forward reference with correct structure', () => {
      const ref = forwardRef(() => TestServiceA);

      expect(ref).toEqual({
        forwardRef: expect.any(Function),
        __forward_ref__: true,
      });
    });

    it('should create forward reference for string token', () => {
      const ref = forwardRef(() => 'string-token');

      expect(ref.__forward_ref__).toBe(true);
      expect(typeof ref.forwardRef).toBe('function');
    });

    it('should create forward reference for InjectionToken', () => {
      const ref = forwardRef(() => TEST_TOKEN);

      expect(ref.__forward_ref__).toBe(true);
      expect(typeof ref.forwardRef).toBe('function');
    });

    it('should create forward reference for constructor', () => {
      const ref = forwardRef(() => TestServiceA);

      expect(ref.__forward_ref__).toBe(true);
      expect(typeof ref.forwardRef).toBe('function');
    });

    it('should allow forward reference function to be called multiple times', () => {
      const ref = forwardRef(() => TestServiceA);

      expect(ref.forwardRef()).toBe(TestServiceA);
      expect(ref.forwardRef()).toBe(TestServiceA);
    });
  });

  describe('isForwardRef', () => {
    it('should return true for forward reference objects', () => {
      const ref = forwardRef(() => TestServiceA);
      expect(isForwardRef(ref)).toBe(true);
    });

    it('should return false for regular tokens', () => {
      expect(isForwardRef(TestServiceA)).toBe(false);
      expect(isForwardRef('string-token')).toBe(false);
      expect(isForwardRef(TEST_TOKEN)).toBe(false);
    });

    it('should return false for objects without __forward_ref__ property', () => {
      const obj = { forwardRef: () => TestServiceA };
      expect(isForwardRef(obj)).toBe(false);
    });

    it('should return false for objects with false __forward_ref__ property', () => {
      const obj = {
        forwardRef: () => TestServiceA,
        __forward_ref__: false,
      };
      expect(isForwardRef(obj)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isForwardRef(null)).toBeFalsy();
      expect(isForwardRef(undefined)).toBeFalsy();
      expect(isForwardRef('string')).toBe(false);
      expect(isForwardRef(123)).toBe(false);
      expect(isForwardRef(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isForwardRef([])).toBe(false);
    });

    it('should return false for functions', () => {
      expect(isForwardRef(() => {})).toBe(false);
    });
  });

  describe('resolveForwardRef', () => {
    it('should resolve forward reference to actual token', () => {
      const ref = forwardRef(() => TestServiceA);
      const resolved = resolveForwardRef(ref);
      expect(resolved).toBe(TestServiceA);
    });

    it('should return regular token as-is', () => {
      const resolved = resolveForwardRef(TestServiceA);
      expect(resolved).toBe(TestServiceA);
    });

    it('should resolve string token forward reference', () => {
      const ref = forwardRef(() => 'string-token');
      const resolved = resolveForwardRef(ref);
      expect(resolved).toBe('string-token');
    });

    it('should resolve InjectionToken forward reference', () => {
      const ref = forwardRef(() => TEST_TOKEN);
      const resolved = resolveForwardRef(ref);
      expect(resolved).toBe(TEST_TOKEN);
    });

    it('should handle circular references without infinite loop', () => {
      // eslint-disable-next-line prefer-const -- Circular reference requires let declarations
      let ref2: any;
      const ref1 = forwardRef(() => ref2);
      ref2 = forwardRef(() => ref1);

      // Should resolve to the first forward ref function result
      const resolved = resolveForwardRef(ref1);
      expect(isForwardRef(resolved)).toBe(true);
    });

    it('should resolve nested forward references', () => {
      const innerRef = forwardRef(() => TestServiceA);
      const outerRef = forwardRef(() => resolveForwardRef(innerRef));

      const resolved = resolveForwardRef(outerRef);
      expect(resolved).toBe(TestServiceA);
    });

    it('should handle forward reference that returns undefined', () => {
      const ref = forwardRef(() => undefined as any);
      const resolved = resolveForwardRef(ref);
      expect(resolved).toBeUndefined();
    });

    it('should handle forward reference that throws error', () => {
      const ref = forwardRef(() => {
        throw new Error('Forward ref error');
      });

      expect(() => resolveForwardRef(ref)).toThrow('Forward ref error');
    });
  });
});
