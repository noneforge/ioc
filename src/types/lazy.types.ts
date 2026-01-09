/**
 * Control interface for lazy proxies that defer dependency resolution until first access.
 *
 * Lazy proxies are created via `createLazyProxy()` or `@Lazy()` decorator and behave as
 * both the target type `T` and this control interface. Accessing any property on the proxy
 * (except these control methods) triggers automatic resolution.
 *
 * @template T - The type of the dependency being lazily resolved
 *
 * @example
 * ```ts
 * const proxy = createLazyProxy(container, ServiceToken);
 *
 * // Check if resolved without triggering resolution
 * console.log(proxy.isResolved); // false
 *
 * // Access triggers resolution
 * proxy.someMethod(); // Resolves on first access
 * console.log(proxy.isResolved); // true
 *
 * // Get the resolved instance directly
 * const instance = proxy.value;
 *
 * // Reset to allow re-resolution
 * proxy.reset();
 * ```
 */
export interface LazyProxy<T> {
  /**
   * Gets the resolved instance, triggering resolution if not already resolved.
   * Subsequent accesses return the cached instance.
   */
  readonly value: T;
  /** Indicates whether the dependency has been resolved */
  readonly isResolved: boolean;
  /**
   * Manually triggers resolution and returns the instance.
   * Safe to call multiple times - returns cached instance if already resolved.
   */
  resolve(): T;
  /**
   * Async version of `resolve()` for dependencies resolved via `container.getAsync()`.
   * Returns cached instance if already resolved.
   */
  resolveAsync(): Promise<T>;
  /**
   * Clears the resolved instance, allowing the next access to re-resolve the dependency.
   * Useful for testing or when the dependency needs to be recreated.
   */
  reset(): void;
}
