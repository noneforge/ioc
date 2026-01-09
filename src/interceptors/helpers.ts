import type { InjectionContext, InterceptorFn, InterceptorLike } from '../types';

/**
 * Options for createInterceptor helper.
 */
export interface CreateInterceptorOptions {
  /**
   * Hook called before `next()` is invoked. Can be async or sync.
   * Use for setup logic, validation, or modifying context metadata.
   */
  pre?: (context: InjectionContext) => void | Promise<void>;
  /**
   * Hook called after `next()` completes. Can transform the resolved value.
   * If provided, must explicitly return a value - returning undefined will
   * replace the result with undefined.
   */
  post?: (context: InjectionContext, result: unknown) => unknown;
}

/**
 * Creates an interceptor from pre/post hooks.
 *
 * The returned interceptor is always async, even if both hooks are synchronous.
 * Pre hook runs before resolution, post hook runs after and can transform the
 * result. Both hooks are optional.
 *
 * @example
 * ```typescript
 * // Performance timing interceptor
 * const timingInterceptor = createInterceptor({
 *   pre: (context) => {
 *     context.metadata.set('startTime', Date.now());
 *   },
 *   post: (context, result) => {
 *     const duration = Date.now() - context.metadata.get('startTime');
 *     console.log(`Resolved ${context.token} in ${duration}ms`);
 *     return result;
 *   }
 * });
 *
 * // Result transformation
 * const wrapperInterceptor = createInterceptor({
 *   post: (context, result) => ({
 *     value: result,
 *     timestamp: Date.now()
 *   })
 * });
 * ```
 */
export function createInterceptor(options: CreateInterceptorOptions): InterceptorFn {
  const { pre, post } = options;

  return async (context: InjectionContext, next: () => unknown): Promise<unknown> => {
    if (pre) {
      await pre(context);
    }

    const result = await next();

    if (post) {
      return post(context, result);
    }

    return result;
  };
}

/**
 * Composes multiple interceptors into a single interceptor.
 *
 * Interceptors execute in order like middleware: the first interceptor
 * wraps all others, the second wraps those after it, etc. Pre-logic runs
 * first-to-last, post-logic runs last-to-first.
 *
 * Accepts both function-based interceptors and object interceptors
 * implementing the `Interceptor` interface.
 *
 * @example
 * ```typescript
 * const combined = composeInterceptors(
 *   loggingInterceptor,    // Runs first (outer layer)
 *   cachingInterceptor,    // Runs second (middle layer)
 *   validationInterceptor  // Runs last (inner layer)
 * );
 *
 * // Execution order:
 * // 1. logging pre-logic
 * // 2. caching pre-logic
 * // 3. validation pre-logic
 * // 4. actual resolution
 * // 5. validation post-logic
 * // 6. caching post-logic
 * // 7. logging post-logic
 * ```
 */
export function composeInterceptors(...interceptors: InterceptorLike[]): InterceptorFn {
  const normalized = interceptors.map((interceptor): InterceptorFn => {
    if (typeof interceptor === 'function') {
      return interceptor;
    }

    return (context: InjectionContext, next: () => unknown): unknown => interceptor.intercept(context, next);
  });

  return (context: InjectionContext, next: () => unknown): unknown => {
    let index = 0;

    const runNext = (): unknown => {
      if (index >= normalized.length) {
        return next();
      }

      const interceptor = normalized[index];
      index += 1;

      return interceptor(context, runNext);
    };

    return runNext();
  };
}

/**
 * Creates a conditional interceptor that only runs when predicate returns true.
 *
 * The predicate is evaluated on every resolution. When it returns false,
 * the interceptor is skipped entirely and `next()` is called directly.
 * Useful for environment-specific logic, debug mode, or feature flags.
 *
 * @param predicate - Evaluated on each resolution to determine if interceptor should run
 * @param interceptor - The interceptor to conditionally execute
 *
 * @example
 * ```typescript
 * // Only log in development mode
 * const debugInterceptor = when(
 *   (ctx) => process.env.NODE_ENV === 'development',
 *   (ctx, next) => {
 *     console.log('Resolving:', ctx.token);
 *     return next();
 *   }
 * );
 *
 * // Skip caching for specific tokens
 * const selectiveCaching = when(
 *   (ctx) => ctx.metadata.get('cacheable') === true,
 *   cachingInterceptor
 * );
 * ```
 */
export function when(predicate: (context: InjectionContext) => boolean, interceptor: InterceptorLike): InterceptorFn {
  const normalized: InterceptorFn =
    typeof interceptor === 'function'
      ? interceptor
      : (context: InjectionContext, next: () => unknown): unknown => interceptor.intercept(context, next);

  return (context: InjectionContext, next: () => unknown): unknown => {
    if (predicate(context)) {
      return normalized(context, next);
    }

    return next();
  };
}
