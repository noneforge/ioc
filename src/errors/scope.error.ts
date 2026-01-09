import type { InjectionContext, ProviderScope } from '../types';
import { InjectionError } from './injection.error';

/**
 * Error thrown when there's an issue with provider scope configuration or resolution.
 *
 * This error occurs when attempting to resolve a dependency with incompatible scope settings,
 * such as injecting a request-scoped provider into a singleton.
 */
export class ScopeError extends InjectionError {
  /** The provider scope that caused the error */
  readonly scope: ProviderScope;

  /**
   * @param message - Error message describing the failure
   * @param scope - The scope that caused the error
   * @param context - Optional injection context for resolution path tracking
   */
  constructor(message: string, scope: ProviderScope, context?: InjectionContext) {
    super(`Scope error [${scope}]: ${message}`, context);

    this.scope = scope;
  }
}
