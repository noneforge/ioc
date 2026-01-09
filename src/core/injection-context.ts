import type { InjectionContext } from '../types';
import { tokenToString } from '../utils';

/**
 * Tracks injection contexts during dependency resolution using a call stack.
 *
 * Each context represents one step in the resolution chain, enabling circular
 * dependency detection and request-scoped metadata access. Use `run()` or `runAsync()`
 * to automatically manage context lifecycle.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class InjectionContextManager {
  private static readonly stack: InjectionContext[] = [];

  private constructor() { /* empty */ }

  /** Pushes a new context onto the stack */
  static push(context: InjectionContext): void {
    this.stack.push(context);
  }

  /** Removes the topmost context from the stack */
  static pop(): void {
    this.stack.pop();
  }

  /** Returns the current context without removing it from the stack */
  static current(): InjectionContext | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  /**
   * Executes a function within the given context.
   * Context is automatically pushed before execution and popped afterward, even if an error occurs.
   */
  static run<T>(context: InjectionContext, fn: () => T): T {
    this.push(context);

    try {
      return fn();
    } finally {
      this.pop();
    }
  }

  /**
   * Executes an async function within the given context.
   * Context is automatically pushed before execution and popped afterward, even if an error occurs.
   */
  static async runAsync<T>(context: InjectionContext, fn: () => Promise<T>): Promise<T> {
    this.push(context);

    try {
      return await fn();
    } finally {
      this.pop();
    }
  }

  /**
   * Returns a string representation of the current resolution path.
   *
   * @example
   * ```ts
   * // During nested resolution:
   * getPath(); // "ServiceA -> ServiceB -> ServiceC"
   * ```
   */
  static getPath(): string {
    return this.stack
      .map((ctx) => ctx.token !== undefined ? tokenToString(ctx.token) : 'unknown')
      .join(' -> ');
  }
}
