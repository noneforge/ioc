import type { InjectionContext, Token } from '../types';
import { tokenToString } from '../utils';
import { InjectionError } from './injection.error';

/**
 * Error thrown when attempting to resolve a token that has no registered provider.
 *
 * This error occurs during dependency resolution when the container cannot find
 * a provider for the requested token. The error message includes the resolution path
 * to help trace which dependency chain caused the failure.
 */
export class NoProviderError extends InjectionError {
  /** The token for which no provider was found */
  readonly token: Token;

  /**
   * @param token - The token being resolved
   * @param context - Optional injection context for resolution path tracking
   */
  constructor(token: Token, context?: InjectionContext) {
    super(`No provider found for: ${tokenToString(token)}`, context);

    this.token = token;
  }
}
