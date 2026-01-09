import type { InjectionContext, Token } from '../types';
import { tokenToString } from '../utils';
import { InjectionError } from './injection.error';

/**
 * Error thrown when a value fails validation during dependency resolution.
 *
 * This error occurs when a provider's validation interceptor or validator rejects
 * a resolved value based on validation rules (e.g., schema validation, type checks).
 */
export class ValidationError extends InjectionError {
  /** The token that was being resolved when validation failed */
  readonly token: Token;

  /** The value that failed validation */
  readonly value: unknown;

  /**
   * @param token - The token being resolved
   * @param value - The value that failed validation
   * @param message - Error message describing the failure
   * @param context - Optional injection context for resolution path tracking
   */
  constructor(token: Token, value: unknown, message: string, context?: InjectionContext) {
    super(`Validation failed for ${tokenToString(token)}: ${message}`, context);

    this.token = token;
    this.value = value;
  }
}
