/**
 * Caches method results based on arguments until TTL expires.
 *
 * Cache keys are generated using `JSON.stringify(args)`, which means:
 * - Arguments must be serializable (no functions, symbols, circular refs)
 * - Object property order matters for cache hits
 * - Each method instance has its own cache (not shared across instances)
 *
 * @param ttl - Cache duration in milliseconds (default: 60000ms / 60s)
 *
 * @example
 * ```ts
 * class UserService {
 *   ＠Cached(5000) // Cache for 5 seconds
 *   fetchUser(id: string) {
 *     return fetch(`/api/users/${id}`);
 *   }
 * }
 * ```
 */
export function Cached(ttl = 60000): MethodDecorator {
  return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const cache = new Map<string, { value: unknown; expires: number }>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const original = descriptor.value;

    descriptor.value = function(this: unknown, ...args: unknown[]) {
      const key = JSON.stringify(args);
      const cached = cache.get(key);

      if (cached !== undefined && Date.now() < cached.expires) {
        return cached.value;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = original.apply(this, args) as unknown;
      cache.set(key, {
        value: result,
        expires: Date.now() + ttl,
      });

      return result;
    };

    return descriptor;
  };
}
