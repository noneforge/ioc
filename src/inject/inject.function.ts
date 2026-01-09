import { InjectionContextManager } from '../core';
import type { ForwardRef, LazyProxy, Token } from '../types';
import { resolveForwardRef } from '../utils';

/**
 * Options for controlling dependency resolution behavior.
 *
 * @see {@link inject} for usage examples
 */
export interface InjectOptions {
  /**
   * Returns null instead of throwing when no provider is registered
   * @default false
   */
  optional?: boolean;
  /**
   * Skips the current container and resolves from parent only
   * @default false
   */
  skipSelf?: boolean;
  /**
   * Resolves only from current container without checking parent hierarchy
   * @default false
   */
  self?: boolean;
  /**
   * Returns a proxy that delays resolution until first property access
   * @default false
   */
  lazy?: boolean;
  /**
   * Returns all registered multi-providers as an array instead of a single instance
   * @default false
   */
  multi?: boolean;
}

/**
 * Resolves a dependency from the current injection context.
 *
 * Must be called during class instantiation or factory execution when an
 * injection context is active. Use within constructors, factory functions,
 * or other code running inside the container's resolution chain.
 *
 * @throws {Error} When called outside an injection context
 * @throws {NoProviderError} When no provider is registered (unless `optional: true`)
 * @throws {CircularDependencyError} When resolution would create a dependency cycle
 *
 * @example
 * ```ts
 * class UserService {
 *   private readonly logger = inject(Logger);
 *   private readonly cache = inject(Cache, { optional: true });
 *   private readonly plugins = inject(Plugin, { multi: true });
 * }
 * ```
 */
export function inject<T>(token: Token<T> | ForwardRef<T>): T;
export function inject<T>(token: Token<T> | ForwardRef<T>, options: { optional: true }): T | null;
export function inject<T>(token: Token<T> | ForwardRef<T>, options: { multi: true }): T[];
export function inject<T>(token: Token<T> | ForwardRef<T>, options: { lazy: true }): T & LazyProxy<T>;
export function inject<T>(
  token: Token<T> | ForwardRef<T>,
  options: { optional: true; lazy: true }
): (T & LazyProxy<T>) | null;
export function inject<T>(
  token: Token<T> | ForwardRef<T>,
  options?: InjectOptions,
): T | T[] | (T & LazyProxy<T>) | null {
  const context = InjectionContextManager.current();
  if (!context) {
    throw new Error(
      'inject() must be called from an injection context',
    );
  }

  const resolved = resolveForwardRef(token);

  if (options?.multi === true) {
    return context.container.get(resolved) as T[];
  }

  return context.container.get(resolved, {
    ...options,
    requestId: context.requestId,
  });
}

/**
 * Resolves a dependency as a lazy proxy.
 *
 * Returns a proxy that delays actual resolution until the first property
 * access. Useful for breaking circular dependencies or deferring expensive
 * initialization.
 *
 * @example
 * ```ts
 * class EmailService {
 *   // Won't resolve Logger until first method call
 *   private readonly logger = injectLazy(Logger);
 * }
 * ```
 */
export function injectLazy<T>(token: Token<T> | ForwardRef<T>, options?: Omit<InjectOptions, 'lazy'>): T & LazyProxy<T> {
  return inject(token, { ...options, lazy: true });
}

/**
 * Resolves all registered multi-providers as an array.
 *
 * Use when multiple implementations of the same token are registered
 * (e.g., plugins, interceptors, validators). Returns empty array if
 * none are registered.
 *
 * @example
 * ```ts
 * class PluginManager {
 *   private readonly plugins = injectAll(Plugin);
 *   // Returns [PluginA, PluginB, PluginC] if all registered
 * }
 * ```
 */
export function injectAll<T>(token: Token<T> | ForwardRef<T>): T[] {
  return inject(token, { multi: true });
}

/**
 * Resolves an optional dependency, returning null if not registered.
 *
 * Use for dependencies that may not always be available or when graceful
 * degradation is needed. Prevents throwing when the provider is missing.
 *
 * @example
 * ```ts
 * class NotificationService {
 *   private readonly sms = injectOptional(SmsProvider);
 *
 *   notify(message: string) {
 *     if (this.sms) {
 *       this.sms.send(message);
 *     }
 *   }
 * }
 * ```
 */
export function injectOptional<T>(token: Token<T> | ForwardRef<T>, options?: Omit<InjectOptions, 'optional'>): T | null {
  return inject(token, { ...options, optional: true });
}
