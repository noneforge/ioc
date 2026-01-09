import type { InjectionContext, Interceptor } from '../../types';
import { tokenToString } from '../../utils';

/**
 * Caches dependency resolution results with automatic TTL-based eviction.
 *
 * Uses token string representation as cache key. Entries are automatically
 * removed after the configured TTL expires.
 *
 * **Note:** Does not handle async dependencies correctly - caches the Promise
 * object itself rather than the resolved value. Use only for synchronous
 * dependencies.
 *
 * @example
 * ```ts
 * const interceptor = new CachingInterceptor(5000); // 5 second TTL
 * container.addInterceptor(interceptor);
 *
 * // First call resolves and caches
 * const service1 = container.get(ExpensiveService);
 * // Second call returns cached instance
 * const service2 = container.get(ExpensiveService);
 * // After 5 seconds, cache expires and next call re-resolves
 * ```
 */
export class CachingInterceptor implements Interceptor {
  private readonly cache = new Map<string, unknown>();
  private readonly ttl: number;

  /**
   * @param ttl - Time-to-live for cached entries in milliseconds.
   */
  constructor(ttl = 60000) {
    this.ttl = ttl;
  }

  /**
   * Caches resolution result by token. Returns cached value if available,
   * otherwise calls `next()` and stores the result.
   *
   * Cache entries are evicted after the TTL expires. If `context.token` is
   * undefined, uses 'unknown' as the cache key.
   */
  intercept<T>(context: InjectionContext, next: () => T | Promise<T>): T | Promise<T> {
    const key = context.token !== undefined ? tokenToString(context.token) : 'unknown';
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    const result = next();
    this.cache.set(key, result);

    setTimeout(() => this.cache.delete(key), this.ttl);

    return result;
  }
}
