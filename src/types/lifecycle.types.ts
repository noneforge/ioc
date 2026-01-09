import type { InjectionContext } from './context.types';

/**
 * Lifecycle hook invoked after a component is instantiated and all dependencies are injected.
 * Ideal for initialization logic that depends on injected dependencies.
 *
 * @example
 * ```ts
 * @Injectable()
 * class DatabaseService implements OnInit {
 *   async onInit() {
 *     await this.connect();
 *   }
 * }
 * ```
 */
export interface OnInit {
  /** Called automatically by the container after dependency injection completes */
  onInit(): void | Promise<void>;
}

/**
 * Lifecycle hook invoked when a component is being removed from the container.
 * Called during container disposal or when a scoped instance is released.
 * Use for cleanup like closing connections or releasing resources.
 *
 * @example
 * ```ts
 * @Injectable()
 * class WebSocketClient implements OnDestroy {
 *   async onDestroy() {
 *     await this.connection.close();
 *   }
 * }
 * ```
 */
export interface OnDestroy {
  /** Called automatically before the instance is removed from the container */
  onDestroy(): void | Promise<void>;
}

/**
 * Resource cleanup interface compatible with explicit disposal patterns.
 * Unlike `OnDestroy`, this is typically invoked manually by calling code
 * rather than automatically by the container.
 *
 * @example
 * ```ts
 * class FileHandle implements Disposable {
 *   dispose() {
 *     this.file.close();
 *   }
 * }
 * ```
 */
export interface Disposable {
  /** Releases resources held by this object */
  dispose(): void | Promise<void>;
}

/**
 * Lifecycle hook invoked immediately after a dependency is resolved from the container
 * but before it's returned to the requesting code. Provides access to the resolution context.
 *
 * @example
 * ```ts
 * @Injectable()
 * class RequestLogger implements OnInject {
 *   onInject(context: InjectionContext) {
 *     console.log(`Injected into ${context.targetType?.name}`);
 *   }
 * }
 * ```
 */
export interface OnInject {
  /**
   * @param context - Contains metadata about the injection point including token, target class, and property name
   */
  onInject(context: InjectionContext): void | Promise<void>;
}

/**
 * Lifecycle hook for request-scoped instances. Called when the instance is created
 * or retrieved for a specific request scope. Useful for request-level initialization
 * like setting correlation IDs or request context.
 *
 * @example
 * ```ts
 * @Injectable({ scope: 'request' })
 * class RequestContext implements OnRequest {
 *   onRequest(requestId: string | symbol) {
 *     this.id = requestId;
 *     this.startTime = Date.now();
 *   }
 * }
 * ```
 */
export interface OnRequest {
  /**
   * @param requestId - Unique identifier for the current request scope
   */
  onRequest(requestId: string | symbol): void | Promise<void>;
}
