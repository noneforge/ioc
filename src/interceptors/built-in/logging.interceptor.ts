import type { InjectionContext, Interceptor } from '../../types';
import { tokenToString } from '../../utils';

/**
 * Logger interface compatible with common logging libraries.
 *
 * Both methods are optional to support minimal loggers or console-like objects.
 */
export interface Logger {
  debug?(message: string, ...args: unknown[]): void;
  error?(message: string, error?: Error): void;
}

/**
 * Logs dependency resolution lifecycle events for debugging and monitoring.
 *
 * Tracks resolution start, completion time, and failures. Handles both synchronous
 * and asynchronous resolutions. Falls back to `console` if no custom logger is provided.
 *
 * @example
 * ```ts
 * // Use with custom logger
 * const interceptor = new LoggingInterceptor(myLogger);
 * container.addInterceptor(interceptor);
 *
 * // Use with default console logging
 * container.addInterceptor(new LoggingInterceptor());
 *
 * // Output example:
 * // [DEBUG] Resolving: UserService
 * // [DEBUG] Resolved: UserService (5ms)
 * ```
 */
export class LoggingInterceptor implements Interceptor {
  private readonly logger?: Logger;

  /**
   * @param logger - Custom logger instance. Falls back to `console` if not provided
   */
  constructor(logger?: Logger) {
    if (logger) {
      this.logger = logger;
    }
  }

  /**
   * Logs resolution lifecycle: start, completion time, and failures.
   *
   * Measures resolution time in milliseconds. For async resolutions, waits for
   * the promise to settle before logging completion or failure.
   */
  intercept<T>(context: InjectionContext, next: () => T | Promise<T>): T | Promise<T> {
    const logger = this.logger ?? console;
    const token = context.token !== undefined ? tokenToString(context.token) : 'unknown';

    logger.debug?.(`Resolving: ${token}`);

    const start = Date.now();

    try {
      const result = next();
      if (result instanceof Promise) {
        return result.then((value) => {
          logger.debug?.(`Resolved: ${token} (${Date.now() - start}ms)`);

          return value;
        }).catch((error: unknown) => {
          logger.error?.(`Failed: ${token}`, error instanceof Error ? error : new Error(String(error)));

          throw error;
        });
      }

      logger.debug?.(`Resolved: ${token} (${Date.now() - start}ms)`);

      return result;
    } catch (error) {
      logger.error?.(`Failed: ${token}`, error as Error);

      throw error;
    }
  }
}
