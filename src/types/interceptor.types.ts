import type { InjectionContext } from './context.types';

/**
 * Intercepts dependency resolution with a functional approach.
 * Must call `next()` to continue the resolution chain.
 *
 * @example
 * ```typescript
 * const loggingInterceptor: InterceptorFn = (context, next) => {
 *   console.log(`Resolving: ${context.token}`);
 *   return next();
 * };
 * ```
 */
export type InterceptorFn = (context: InjectionContext, next: () => unknown) => unknown;

/**
 * Intercepts dependency resolution for cross-cutting concerns.
 *
 * @example
 * ```typescript
 * class LoggingInterceptor implements Interceptor {
 *   intercept<T>(context: InjectionContext, next: () => T): T {
 *     console.log(`Resolving: ${context.token}`);
 *     return next();
 *   }
 * }
 * ```
 */
export interface Interceptor {
  /**
   * Called during resolution. Must call `next()` to continue the chain.
   * Throwing before `next()` prevents resolution; throwing after allows cleanup.
   */
  intercept<T>(context: InjectionContext, next: () => T | Promise<T>): T | Promise<T>;
}

/**
 * Union type for both class-based and functional interceptors.
 * Use this type when accepting interceptors from user code.
 */
export type InterceptorLike = Interceptor | InterceptorFn;

/**
 * Container middleware for pre/post resolution hooks.
 * Lower priority values execute first.
 *
 * @example
 * ```typescript
 * const validationMiddleware: Middleware = {
 *   priority: 10,
 *   pre(context) {
 *     console.log(`Before resolving ${context.token}`);
 *   },
 *   post(context, instance) {
 *     console.log(`After resolving ${context.token}`);
 *     return instance;
 *   }
 * };
 * ```
 */
export interface Middleware {
  /** Execution order (lower values run first) */
  priority: number;
  /** Invoked before resolution. Can perform validation or setup */
  pre?(context: InjectionContext): void | Promise<void>;
  /** Invoked after resolution. Can transform or wrap the resolved instance */
  post?<T>(context: InjectionContext, instance: T): T | Promise<T>;
}
