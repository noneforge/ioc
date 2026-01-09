import { describe, expect, it } from 'vitest';

import type { InjectionContext } from '../../../src';
import { InjectionError, NoProviderError } from '../../../src';
import { TEST_TOKEN, TestServiceA } from '../../helpers/test-fixtures';

// Helper to create partial context for tests
const mockContext = (overrides: Partial<InjectionContext> = {}): InjectionContext => ({
  container: undefined as any,
  metadata: new Map(),
  depth: 0,
  path: [],
  strategy: 'default',
  ...overrides,
});

describe('NoProviderError', () => {
  describe('Error creation', () => {
    it('should extend InjectionError', () => {
      const error = new NoProviderError(TestServiceA);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InjectionError);
      expect(error).toBeInstanceOf(NoProviderError);
    });

    it('should have correct name', () => {
      const error = new NoProviderError(TestServiceA);

      expect(error.name).toBe('NoProviderError');
    });

    it('should store the token', () => {
      const error = new NoProviderError(TestServiceA);

      expect(error.token).toBe(TestServiceA);
    });
  });

  describe('Message formatting', () => {
    it('should format message with constructor token', () => {
      const error = new NoProviderError(TestServiceA);

      expect(error.message).toBe('No provider found for: TestServiceA');
    });

    it('should format message with string token', () => {
      const token = 'MyService';
      const error = new NoProviderError(token);

      expect(error.message).toBe('No provider found for: MyService');
    });

    it('should format message with InjectionToken', () => {
      const error = new NoProviderError(TEST_TOKEN);

      expect(error.message).toBe('No provider found for: InjectionToken(TEST_TOKEN)');
    });

    it('should format message with symbol token', () => {
      const symbolToken = Symbol('MySymbolToken');
      const error = new NoProviderError(symbolToken);

      expect(error.message).toBe(`No provider found for: ${symbolToken.toString()}`);
    });

    it('should handle tokens without toString method', () => {
      const objectToken = { name: 'ObjectToken' };
      const error = new NoProviderError(objectToken as any);

      expect(error.message).toContain('No provider found for:');
      expect(error.message).toContain('[object Object]');
    });

    it('should handle null token', () => {
      const error = new NoProviderError(null as any);

      expect(error.message).toBe('No provider found for: null');
    });

    it('should handle undefined token', () => {
      const error = new NoProviderError(undefined as any);

      expect(error.message).toBe('No provider found for: undefined');
    });
  });

  describe('Context handling', () => {
    it('should include context information', () => {
      const context = mockContext({ token: TestServiceA });

      const error = new NoProviderError('MissingService', context);

      expect(error.context).toBe(context);
      expect(error.message).toContain('Resolution path:');
      expect(error.message).toContain('TestServiceA');
    });

    it('should work without context', () => {
      const error = new NoProviderError(TestServiceA);

      expect(error.context).toBeUndefined();
      expect(error.message).not.toContain('Resolution path:');
    });

    it('should handle context with different token', () => {
      const context = mockContext({ token: 'ParentService' });

      const error = new NoProviderError(TestServiceA, context);

      expect(error.token).toBe(TestServiceA);
      expect(error.context?.token).toBe('ParentService');
      expect(error.message).toContain('No provider found for: TestServiceA');
      expect(error.message).toContain('Resolution path: ParentService');
    });
  });

  describe('Error usage', () => {
    it('should be throwable and catchable', () => {
      expect(() => {
        throw new NoProviderError(TestServiceA);
      }).toThrow(NoProviderError);

      try {
        throw new NoProviderError(TestServiceA);
      } catch (error) {
        expect(error).toBeInstanceOf(NoProviderError);
        expect((error as NoProviderError).token).toBe(TestServiceA);
      }
    });

    it('should be catchable as InjectionError', () => {
      try {
        throw new NoProviderError('MyService');
      } catch (error) {
        expect(error).toBeInstanceOf(InjectionError);
        expect((error as InjectionError).name).toBe('NoProviderError');
      }
    });

    it('should be catchable as Error', () => {
      try {
        throw new NoProviderError(TEST_TOKEN);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('No provider found for');
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle missing service dependency', () => {
      const error = new NoProviderError('DatabaseService');

      expect(error.message).toBe('No provider found for: DatabaseService');
      expect(error.token).toBe('DatabaseService');
    });

    it('should handle missing configuration token', () => {
      const configToken = Symbol('APP_CONFIG');
      const error = new NoProviderError(configToken);

      expect(error.message).toContain('No provider found for: Symbol(APP_CONFIG)');
      expect(error.token).toBe(configToken);
    });

    it('should handle missing interface implementation', () => {
      const interfaceToken = 'IUserRepository';
      const context = mockContext({ token: 'UserService' });

      const error = new NoProviderError(interfaceToken, context);

      expect(error.message).toContain('No provider found for: IUserRepository');
      expect(error.message).toContain('Resolution path: UserService');
      expect(error.token).toBe(interfaceToken);
    });

    it('should handle missing optional dependency', () => {
      const optionalService = 'OptionalLoggingService';
      const error = new NoProviderError(optionalService);

      expect(error.message).toBe('No provider found for: OptionalLoggingService');
      expect(error.token).toBe(optionalService);
    });

    it('should handle missing factory dependency', () => {
      const factoryToken = 'ConnectionFactory';
      const error = new NoProviderError(factoryToken);

      expect(error.message).toBe('No provider found for: ConnectionFactory');
      expect(error.token).toBe(factoryToken);
    });
  });

  describe('Token variations', () => {
    it('should handle class constructor tokens', () => {
      class MyService {}
      const error = new NoProviderError(MyService);

      expect(error.token).toBe(MyService);
      expect(error.message).toContain('MyService');
    });

    it('should handle function tokens', () => {
      function MyFunction() {}

      const error = new NoProviderError(MyFunction);

      expect(error.token).toBe(MyFunction);
      expect(error.message).toContain('MyFunction');
    });

    it('should handle primitive tokens', () => {
      const numberToken = 42;
      const booleanToken = true;

      const numberError = new NoProviderError(numberToken as any);
      const booleanError = new NoProviderError(booleanToken as any);

      expect(numberError.message).toContain('42');
      expect(booleanError.message).toContain('true');
    });
  });
});
