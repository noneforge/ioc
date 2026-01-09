import { InjectionContextManager } from '../core/injection-context';
import type { InjectionContext } from '../types';
import { tokenToString } from '../utils';

/**
 * Base class for all dependency injection errors.
 *
 * Extends the standard Error with injection-specific context and automatically
 * builds a resolution path to help trace dependency chains when errors occur.
 */
export abstract class InjectionError extends Error {
  /** Injection context containing the token and target being resolved */
  readonly context?: InjectionContext;

  /** The underlying error that caused this injection error */
  override readonly cause?: Error;

  /**
   * @param message - Error message describing the failure
   * @param context - Optional injection context for resolution path tracking
   * @param cause - Optional underlying error that caused this injection error
   */
  protected constructor(message: string, context?: InjectionContext, cause?: Error) {
    super(message);

    this.name = this.constructor.name;
    this.context = context;
    this.cause = cause;

    if (context) {
      const currentPath = InjectionContextManager.getPath();
      const tokenName = context.token !== undefined ? tokenToString(context.token) : 'unknown';
      const fullPath = currentPath !== '' ? `${currentPath} -> ${tokenName}` : tokenName;

      this.message += `\nResolution path: ${fullPath}`;
    }

    if (cause) {
      this.message += `\nCaused by: ${cause.message}`;
    }
  }
}
