import { ScopeError } from '../errors';
import type { Token } from '../types';
import { hasOnDestroy } from '../utils';

/**
 * Manages custom named scopes for dependency injection.
 *
 * Scopes store instances keyed by token, allowing lifetime control beyond
 * singleton and transient. Common use cases include request-scoped services
 * in web applications or session-scoped state.
 *
 * @example
 * ```ts
 * const scopeManager = new ScopeManager();
 *
 * // Create request scope
 * scopeManager.createScope('request-123');
 * scopeManager.setInScope('request-123', UserService, userServiceInstance);
 *
 * // Retrieve instance
 * const service = scopeManager.getFromScope('request-123', UserService);
 *
 * // Cleanup with lifecycle hooks
 * await scopeManager.clearScope('request-123');
 * ```
 */
export class ScopeManager {
  private readonly scopes = new Map<string, Map<Token, unknown>>();

  /**
   * Creates a new scope with the given name. Idempotent - calling multiple
   * times with the same name has no effect.
   */
  createScope(name: string): void {
    if (!this.scopes.has(name)) {
      this.scopes.set(name, new Map());
    }
  }

  /**
   * Deletes a scope immediately without invoking lifecycle hooks.
   * For cleanup with `onDestroy` callbacks, use `clearScope()` instead.
   */
  deleteScope(name: string): void {
    this.scopes.delete(name);
  }

  /**
   * Stores an instance in the specified scope.
   *
   * @throws {ScopeError} When the scope does not exist. Call `createScope()` first.
   */
  setInScope(name: string, token: Token, value: unknown): void {
    const scope = this.scopes.get(name);
    if (!scope) {
      throw new ScopeError(`Scope '${name}' does not exist`, 'scoped');
    }

    scope.set(token, value);
  }

  /**
   * Retrieves an instance from the scope, or `undefined` if not found
   * or scope doesn't exist.
   */
  getFromScope(name: string, token: Token): unknown {
    return this.scopes.get(name)?.get(token);
  }

  /** Checks if a scope with the given name exists */
  hasScope(name: string): boolean {
    return this.scopes.has(name);
  }

  /**
   * Clears all instances in the scope, invoking `onDestroy()` lifecycle hooks.
   * Waits for all async cleanup to complete before clearing the scope.
   * Safe to call on non-existent scopes (no-op).
   */
  async clearScope(name: string): Promise<void> {
    const scope = this.scopes.get(name);
    if (scope) {
      for (const instance of scope.values()) {
        if (hasOnDestroy(instance)) {
          await instance.onDestroy();
        }
      }

      scope.clear();
    }
  }

  /** Returns all scope names currently managed */
  listScopes(): string[] {
    return Array.from(this.scopes.keys());
  }
}
