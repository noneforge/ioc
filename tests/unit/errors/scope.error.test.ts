import { describe, expect, it } from 'vitest';

import type { InjectionContext } from '../../../src';
import { InjectionError, ScopeError } from '../../../src';

const mockContext = (overrides: Partial<InjectionContext> = {}): InjectionContext => ({
  container: undefined as any,
  metadata: new Map(),
  depth: 0,
  path: [],
  strategy: 'default',
  ...overrides,
});

describe('ScopeError', () => {
  it('should extend InjectionError', () => {
    const error = new ScopeError('Test error', 'singleton');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InjectionError);
    expect(error).toBeInstanceOf(ScopeError);
  });

  it('should format message with scope', () => {
    const error = new ScopeError('Cannot resolve in current scope', 'singleton');

    expect(error.message).toBe('Scope error [singleton]: Cannot resolve in current scope');
    expect(error.scope).toBe('singleton');
  });

  it('should handle different scope types', () => {
    const singletonError = new ScopeError('Singleton error', 'singleton');
    const transientError = new ScopeError('Transient error', 'transient');
    const requestError = new ScopeError('Request error', 'request');

    expect(singletonError.message).toContain('[singleton]');
    expect(transientError.message).toContain('[transient]');
    expect(requestError.message).toContain('[request]');
  });

  it('should include context when provided', () => {
    const context = mockContext({ token: 'TestService' });
    const error = new ScopeError('Scope mismatch', 'transient', context);

    expect(error.context).toBe(context);
    expect(error.message).toContain('Resolution path:');
  });
});
