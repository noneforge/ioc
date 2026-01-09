import type { ForwardRef, Token } from '../types';

/**
 * Creates a forward reference to a token for handling circular dependencies.
 * Wraps a token in a lazy function that's resolved only when needed, breaking
 * circular references between classes that depend on each other.
 *
 * @template T - The instance type of the resolved dependency
 *
 * @example
 * ```ts
 * // Break circular dependency between two services
 * class ServiceA {
 *   constructor(@Inject(forwardRef(() => ServiceB)) private b: ServiceB) {}
 * }
 *
 * class ServiceB {
 *   constructor(private a: ServiceA) {}
 * }
 * ```
 *
 * @example
 * ```ts
 * // Use with provider definitions
 * container.register({
 *   provide: 'MyService',
 *   useClass: forwardRef(() => MyService)
 * });
 * ```
 */
export function forwardRef<T>(fn: () => Token<T>): ForwardRef<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  return { forwardRef: fn as any, __forward_ref__: true } as ForwardRef<T>;
}

/**
 * Type guard that checks if a value is a forward reference.
 * Narrows the type to `ForwardRef<T>` when true.
 *
 * @template T - The instance type of the potential forward reference
 */
export function isForwardRef<T>(token: unknown): token is ForwardRef<T> {
  if (token === null || typeof token !== 'object') {
    return false;
  }

  /* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  return '__forward_ref__' in token && (token as ForwardRef<T>).__forward_ref__ === true;
  /* eslint-enable @typescript-eslint/no-unnecessary-boolean-literal-compare */
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */
}

/**
 * Unwraps a forward reference to its actual token.
 * If the input is not a forward reference, returns it unchanged.
 *
 * @template T - The instance type of the token
 */
export function resolveForwardRef<T>(token: Token<T> | ForwardRef<T>): Token<T> {
  if (isForwardRef<T>(token)) {
    return token.forwardRef();
  }

  return token;
}
