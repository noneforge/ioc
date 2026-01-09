import type { InjectionContext, Interceptor } from '../../types';

/**
 * Retries dependency resolution on failure with exponential backoff.
 *
 * Automatically retries failed resolutions up to the configured maximum,
 * with delays increasing exponentially between attempts (delay × 2^attempt).
 * Useful for handling transient failures in async providers or factory functions.
 *
 * **Note:** Retries on ANY error. For selective retries, wrap this interceptor
 * with custom error filtering logic.
 *
 * @example
 * ```ts
 * const interceptor = new RetryInterceptor(5, 500); // 5 retries, 500ms base delay
 * container.addInterceptor(interceptor);
 *
 * // First attempt fails, retries with delays: 500ms, 1000ms, 2000ms, 4000ms, 8000ms
 * const service = await container.get(UnreliableService);
 * // Throws last error if all attempts fail
 * ```
 */
export class RetryInterceptor implements Interceptor {
  private readonly maxRetries: number;
  private readonly delay: number;

  /**
   * @param maxRetries - Maximum number of retry attempts after initial failure.
   * @param delay - Base delay in milliseconds before first retry (doubles each attempt).
   */
  constructor(maxRetries = 3, delay = 1000) {
    this.maxRetries = maxRetries;
    this.delay = delay;
  }

  /**
   * Retries resolution on failure with exponential backoff.
   *
   * Delays between retries: `delay × 2^attempt` (0-indexed). For example, with
   * delay=1000: first retry after 1s, second after 2s, third after 4s, etc.
   *
   * @throws {Error} The last error encountered if all retry attempts fail
   */
  async intercept<T>(_context: InjectionContext, next: () => T | Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        return await Promise.resolve(next());
      } catch (error) {
        lastError = error as Error;

        if (i < this.maxRetries) {
          await new Promise((resolve) => {
            setTimeout(resolve, this.delay * Math.pow(2, i));
          });
        }
      }
    }

    throw lastError ?? new Error('Retry failed');
  }
}
