import type { Token } from '../types';
import { hasOnDestroy, isDisposable } from '../utils';

/**
 * Manages request-scoped instances and their lifecycle within a single request.
 * Supports hierarchical contexts where child contexts inherit parent instances.
 *
 * @example
 * ```ts
 * const context = new RequestContext('req-123');
 * context.setInstance(UserService, userServiceInstance);
 * const instance = context.getInstance(UserService);
 * await context.dispose(); // Cleanup when request completes
 * ```
 */
export class RequestContext {
  /** Unique identifier for this request context */
  readonly id: string | symbol;
  /** Arbitrary metadata attached to this request (e.g., user ID, trace ID) */
  readonly metadata: Map<string, unknown>;
  /** Request-scoped instances cached in this context */
  private readonly instances = new Map<Token, object>();
  /** Parent context for hierarchical instance resolution */
  private readonly parent?: RequestContext;
  readonly createdAt = Date.now();

  /**
   * @param id - Context identifier. Defaults to a unique symbol if not provided
   * @param parent - Parent context for instance inheritance. Child contexts check parent if instance not found locally
   */
  constructor(id?: string | symbol, parent?: RequestContext) {
    this.id = id ?? Symbol('request');
    this.metadata = new Map();
    this.parent = parent;
  }

  /** Stores a resolved instance for the given token in this context */
  setInstance(token: Token, instance: object): void {
    this.instances.set(token, instance);
  }

  /**
   * Retrieves an instance by token, checking parent context if not found locally.
   * Returns undefined if instance doesn't exist in this context or any parent
   */
  getInstance(token: Token): object | undefined {
    return this.instances.get(token) ?? this.parent?.getInstance(token);
  }

  /** Gets the duration in milliseconds since this context was created */
  getDuration(): number {
    return Date.now() - this.createdAt;
  }

  /** Creates a child context that inherits instances from this context */
  createChild(): RequestContext {
    return new RequestContext(Symbol('request-child'), this);
  }

  /**
   * Disposes all instances in reverse creation order.
   * Calls lifecycle hooks (`onDestroy`, `dispose`) if implemented by instances
   */
  async dispose(): Promise<void> {
    const instances = Array.from(this.instances.values()).reverse();

    for (const instance of instances) {
      if (hasOnDestroy(instance)) {
        await instance.onDestroy();
      }

      if (isDisposable(instance)) {
        await instance.dispose();
      }
    }

    this.instances.clear();
  }
}
