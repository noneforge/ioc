import type { InjectionContext, Middleware } from '../types';

/**
 * Middleware runner for dependency injection.
 *
 * Executes middleware hooks in priority order (lower priority values run first).
 * Middleware can intercept resolution before (pre) and after (post) instance creation.
 *
 * @example
 * ```ts
 * const runner = new MiddlewareRunner();
 *
 * runner.add({
 *   priority: 10, // Runs before priority 100
 *   pre: (ctx) => console.log(`Resolving: ${String(ctx.token)}`),
 *   post: (ctx, instance) => {
 *     console.log(`Resolved: ${String(ctx.token)}`);
 *     return instance;
 *   }
 * });
 * ```
 */
export class MiddlewareRunner {
  private readonly middlewares: Middleware[] = [];

  /**
   * Adds a middleware to the runner.
   * Middleware are sorted by priority (ascending - lower values run first).
   */
  add(middleware: Middleware): void {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Returns a copy of registered middlewares.
   * Useful for child container inheritance.
   */
  getMiddlewares(): readonly Middleware[] {
    return [...this.middlewares];
  }

  /**
   * Runs all pre hooks asynchronously.
   * Use with async resolution (getAsync).
   */
  async runPre(context: InjectionContext): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.pre) {
        await middleware.pre(context);
      }
    }
  }

  /**
   * Runs all pre hooks synchronously.
   * Throws if any middleware has an async pre hook.
   * Use with sync resolution (get).
   */
  runPreSync(context: InjectionContext): void {
    for (const middleware of this.middlewares) {
      if (middleware.pre) {
        const result = middleware.pre(context);
        if (result instanceof Promise) {
          throw new Error(
            'Async middleware pre() hook cannot be used with synchronous resolution. Use getAsync() instead.',
          );
        }
      }
    }
  }

  /**
   * Runs all post hooks asynchronously.
   * Use with async resolution (getAsync).
   */
  async runPost<T>(context: InjectionContext, instance: T): Promise<T> {
    let result: T = instance;

    for (const middleware of this.middlewares) {
      if (middleware.post) {
        result = await middleware.post(context, result);
      }
    }

    return result;
  }

  /**
   * Runs all post hooks synchronously.
   * Throws if any middleware has an async post hook.
   * Use with sync resolution (get).
   */
  runPostSync<T>(context: InjectionContext, instance: T): T {
    let result: T = instance;

    for (const middleware of this.middlewares) {
      if (middleware.post) {
        const postResult = middleware.post(context, result);
        if (postResult instanceof Promise) {
          throw new Error(
            'Async middleware post() hook cannot be used with synchronous resolution. Use getAsync() instead.',
          );
        }

        result = postResult;
      }
    }

    return result;
  }
}
