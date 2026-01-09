import type { LazyProxy, Token } from '../types';

/**
 * Minimal container interface to avoid circular dependency with Container class.
 * Only requires get/getAsync methods needed for lazy resolution.
 */
interface ContainerLike {
  get<T>(token: Token<T>, options?: unknown): T;
  getAsync<T>(token: Token<T>, options?: unknown): Promise<T>;
}

/**
 * Creates a lazy proxy that defers dependency resolution until first access.
 *
 * The proxy intercepts all property access and resolves the actual instance on-demand.
 * Special LazyProxy properties (`value`, `isResolved`, `resolve`, `resolveAsync`, `reset`)
 * are handled directly by the proxy. All other properties are forwarded to the resolved instance.
 *
 * Resolution options are cloned with `lazy: false` and `proxy: false` to prevent
 * infinite recursion when the container attempts to resolve the same token again.
 *
 * @param container - Container instance used for dependency resolution
 * @param token - Injection token identifying the dependency to resolve
 * @param options - Resolution options passed to container.get(), will be merged with `{ lazy: false, proxy: false }`
 * @returns A proxy that behaves like T but resolves lazily, with additional LazyProxy control methods
 *
 * @example
 * ```ts
 * const proxy = createLazyProxy(container, ServiceToken);
 *
 * // Not resolved yet
 * console.log(proxy.isResolved); // false
 *
 * // Accessing any property triggers resolution
 * proxy.someMethod(); // Resolves now
 * console.log(proxy.isResolved); // true
 *
 * // Access the resolved instance directly
 * const instance = proxy.value;
 *
 * // Reset for re-resolution
 * proxy.reset();
 * ```
 */
export function createLazyProxy<T>(
  container: ContainerLike,
  token: Token<T>,
  options?: unknown,
): T & LazyProxy<T> {
  let resolved = false;
  let instance: T | undefined;

  const resolve = (): T => {
    if (!resolved) {
      const resolveOptions = options !== undefined && options !== null
        ? { ...(options as Record<string, unknown>), lazy: false, proxy: false }
        : undefined;

      instance = container.get(token, resolveOptions);
      resolved = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return instance!;
  };

  const handler: ProxyHandler<object> = {
    get(_target, prop): unknown {
      if (prop === 'value') {
        return resolve();
      }

      if (prop === 'isResolved') {
        return resolved;
      }

      if (prop === 'resolve') {
        return resolve;
      }

      if (prop === 'resolveAsync') {
        return async (): Promise<T> => {
          if (!resolved) {
            const resolveOptions = options !== undefined && options !== null
              ? { ...(options as Record<string, unknown>), lazy: false, proxy: false }
              : undefined;

            instance = await container.getAsync(token, resolveOptions);
            resolved = true;
          }

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return instance!;
        };
      }

      if (prop === 'reset') {
        return () => {
          resolved = false;
          instance = undefined;
        };
      }

      const inst = resolve();

      return Reflect.get(inst as object, prop) as unknown;
    },
    set(_target, prop, value: unknown) {
      const inst = resolve();

      return Reflect.set(inst as object, prop, value);
    },
    has(_target, prop) {
      const inst = resolve();

      return Reflect.has(inst as object, prop);
    },
  };

  return new Proxy({}, handler) as T & LazyProxy<T>;
}
