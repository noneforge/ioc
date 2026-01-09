import type { InjectionContext, InterceptorFn, InterceptorLike } from '../types';

/**
 * Converts class-based interceptors to functional form.
 *
 * Functions are returned as-is; objects with `intercept` method are wrapped
 * in a function that delegates to the method.
 */
function normalizeInterceptor(interceptor: InterceptorLike): InterceptorFn {
  if (typeof interceptor === 'function') {
    return interceptor;
  }

  return (context: InjectionContext, next: () => unknown): unknown => interceptor.intercept(context, next);
}

/**
 * Executes interceptors in order, forming a middleware-like chain.
 *
 * Each interceptor receives the injection context and a `next()` function.
 * Calling `next()` continues to the next interceptor or eventually invokes
 * the factory function. Interceptors can modify context, wrap results, or
 * short-circuit by not calling `next()`.
 *
 * @example
 * ```ts
 * const chain = new InterceptorChain([
 *   loggingInterceptor,
 *   cachingInterceptor
 * ]);
 *
 * // Execute with sync factory
 * const result = chain.execute(context, () => new Service());
 *
 * // Execute with async factory
 * const asyncResult = await chain.executeAsync(context, async () => await fetch('/api'));
 * ```
 */
export class InterceptorChain {
  private readonly normalizedInterceptors: InterceptorFn[];

  constructor(interceptors: InterceptorLike[] = []) {
    this.normalizedInterceptors = interceptors.map(normalizeInterceptor);
  }

  /** Appends an interceptor to the end of the chain */
  add(interceptor: InterceptorLike): void {
    this.normalizedInterceptors.push(normalizeInterceptor(interceptor));
  }

  /**
   * Executes the chain with a synchronous factory.
   *
   * Interceptors run in order. Each must call `next()` to proceed. The factory
   * is invoked only after all interceptors have called `next()`.
   *
   * @param context - Injection context passed to each interceptor
   * @param factory - Function that creates the dependency, called at the end of the chain
   */
  execute<T>(context: InjectionContext, factory: () => T): T {
    let index = 0;

    const next = (): unknown => {
      if (index >= this.normalizedInterceptors.length) {
        return factory();
      }

      const interceptor = this.normalizedInterceptors[index];
      index += 1;

      return interceptor(context, next);
    };

    return next() as T;
  }

  /**
   * Executes the chain with an async factory.
   *
   * Similar to `execute()` but handles async factories and interceptors.
   * All interceptors receive the same `next` signature regardless of whether
   * they're async or not.
   *
   * @param context - Injection context passed to each interceptor
   * @param factory - Async function that creates the dependency, called at the end of the chain
   */
  async executeAsync<T>(context: InjectionContext, factory: () => T | Promise<T>): Promise<T> {
    let index = 0;

    const next = async (): Promise<unknown> => {
      if (index >= this.normalizedInterceptors.length) {
        return factory();
      }

      const interceptor = this.normalizedInterceptors[index];
      index += 1;

      return interceptor(context, next);
    };

    return await next() as T;
  }
}
