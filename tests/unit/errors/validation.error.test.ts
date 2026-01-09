import { describe, expect, it } from 'vitest';

import type { InjectionContext } from '../../../src';
import { InjectionError, ValidationError } from '../../../src';
import { TEST_TOKEN, TestServiceA } from '../../helpers/test-fixtures';

const mockContext = (overrides: Partial<InjectionContext> = {}): InjectionContext => ({
  container: undefined as any,
  metadata: new Map(),
  depth: 0,
  path: [],
  strategy: 'default',
  ...overrides,
});

describe('ValidationError', () => {
  it('should extend InjectionError', () => {
    const error = new ValidationError(TestServiceA, 'invalid-value', 'Value is invalid');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InjectionError);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('should store token and value', () => {
    const value = { prop: 'test' };
    const error = new ValidationError(TEST_TOKEN, value, 'Invalid structure');

    expect(error.token).toBe(TEST_TOKEN);
    expect(error.value).toBe(value);
  });

  it('should format message correctly', () => {
    const error = new ValidationError('UserService', null, 'Cannot be null');

    expect(error.message).toBe('Validation failed for UserService: Cannot be null');
  });

  it('should handle different token types', () => {
    const stringError = new ValidationError('StringToken', 'value', 'String validation failed');
    const classError = new ValidationError(TestServiceA, {}, 'Object validation failed');
    const tokenError = new ValidationError(TEST_TOKEN, 42, 'Number validation failed');

    expect(stringError.message).toContain('StringToken');
    expect(classError.message).toContain('TestServiceA');
    expect(tokenError.message).toContain('InjectionToken(TEST_TOKEN)');
  });

  it('should include context when provided', () => {
    const context = mockContext({ token: 'ParentService' });
    const error = new ValidationError('ChildService', 'bad-value', 'Validation failed', context);

    expect(error.context).toBe(context);
    expect(error.message).toContain('Resolution path:');
  });
});
