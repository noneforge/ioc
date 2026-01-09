import { describe, expect, it } from 'vitest';

import type { InjectionContext } from '../../../src';
import { CircularDependencyError, InjectionError } from '../../../src';
import { TEST_TOKEN, TestServiceA, TestServiceB } from '../../helpers/test-fixtures';

describe('CircularDependencyError', () => {
  describe('Error creation', () => {
    it('should extend InjectionError', () => {
      const cycle = [TestServiceA, TestServiceB];
      const error = new CircularDependencyError(cycle);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InjectionError);
      expect(error).toBeInstanceOf(CircularDependencyError);
    });

    it('should have correct name', () => {
      const cycle = [TestServiceA];
      const error = new CircularDependencyError(cycle);

      expect(error.name).toBe('CircularDependencyError');
    });

    it('should store the cycle', () => {
      const cycle = [TestServiceA, TestServiceB, TestServiceA];
      const error = new CircularDependencyError(cycle);

      expect(error.cycle).toBe(cycle);
      expect(error.cycle).toEqual([TestServiceA, TestServiceB, TestServiceA]);
    });
  });

  describe('Message formatting', () => {
    it('should format message with constructor tokens', () => {
      const cycle = [TestServiceA, TestServiceB];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('Circular dependency detected:');
      expect(error.message).toContain('TestServiceA -> TestServiceB');
    });

    it('should format message with string tokens', () => {
      const cycle = ['ServiceA', 'ServiceB', 'ServiceC'];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('Circular dependency detected: ServiceA -> ServiceB -> ServiceC');
    });

    it('should format message with InjectionToken', () => {
      const cycle = [TEST_TOKEN, TestServiceA];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('Circular dependency detected:');
      expect(error.message).toContain('InjectionToken(TEST_TOKEN) -> TestServiceA');
    });

    it('should format message with mixed token types', () => {
      const cycle = [TestServiceA, 'StringToken', TEST_TOKEN];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('Circular dependency detected:');
      expect(error.message).toContain('TestServiceA -> StringToken -> InjectionToken(TEST_TOKEN)');
    });

    it('should handle single token cycle', () => {
      const cycle = [TestServiceA];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('Circular dependency detected: TestServiceA');
    });

    it('should handle empty cycle', () => {
      const cycle: any[] = [];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('Circular dependency detected: ');
    });

    it('should handle cycle with self-reference', () => {
      const cycle = [TestServiceA, TestServiceA];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('Circular dependency detected: TestServiceA -> TestServiceA');
    });
  });

  describe('Context handling', () => {
    it('should include context information', () => {
      const context = {
        token: TestServiceA,
        container: undefined as any,
        scope: 'singleton' as any,
        metadata: new Map(),
        depth: 0,
        path: [],
        strategy: 'default',
      } as InjectionContext;
      const cycle = [TestServiceA, TestServiceB];

      const error = new CircularDependencyError(cycle, context);

      expect(error.context).toBe(context);
      expect(error.message).toContain('Resolution path:');
      expect(error.message).toContain('TestServiceA');
    });

    it('should work without context', () => {
      const cycle = [TestServiceA, TestServiceB];
      const error = new CircularDependencyError(cycle);

      expect(error.context).toBeUndefined();
      expect(error.message).not.toContain('Resolution path:');
    });
  });

  describe('Error usage', () => {
    it('should be throwable and catchable', () => {
      const cycle = [TestServiceA, TestServiceB];

      expect(() => {
        throw new CircularDependencyError(cycle);
      }).toThrow(CircularDependencyError);

      try {
        throw new CircularDependencyError(cycle);
      } catch (error) {
        expect(error).toBeInstanceOf(CircularDependencyError);
        expect((error as CircularDependencyError).cycle).toEqual(cycle);
      }
    });

    it('should be catchable as InjectionError', () => {
      const cycle = [TestServiceA];

      try {
        throw new CircularDependencyError(cycle);
      } catch (error) {
        expect(error).toBeInstanceOf(InjectionError);
        expect((error as InjectionError).name).toBe('CircularDependencyError');
      }
    });

    it('should be catchable as Error', () => {
      const cycle = [TestServiceA];

      try {
        throw new CircularDependencyError(cycle);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Circular dependency detected');
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical circular dependency A -> B -> A', () => {
      const cycle = [TestServiceA, TestServiceB, TestServiceA];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('TestServiceA -> TestServiceB -> TestServiceA');
      expect(error.cycle).toHaveLength(3);
    });

    it('should handle complex circular dependency chain', () => {
      const cycle = ['UserService', 'AuthService', 'TokenService', 'UserService'];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('UserService -> AuthService -> TokenService -> UserService');
      expect(error.cycle).toHaveLength(4);
    });

    it('should handle self-circular dependency', () => {
      const cycle = ['SelfReferencingService', 'SelfReferencingService'];
      const error = new CircularDependencyError(cycle);

      expect(error.message).toContain('SelfReferencingService -> SelfReferencingService');
      expect(error.cycle).toHaveLength(2);
    });
  });
});
