import type { ResolutionStrategy, Token } from './common.types';

/**
 * Minimal container interface used to avoid circular dependencies.
 *
 * Defines only the essential methods needed for dependency resolution,
 * allowing types like `createLazyProxy` to reference container functionality
 * without importing the full Container class.
 */
export interface ContainerLike {
  /** Resolves a single instance for the given token */
  get<T>(token: Token<T>, options?: unknown): T;
  /** Asynchronously resolves a single instance for the given token */
  getAsync<T>(token: Token<T>, options?: unknown): Promise<T>;
  /** Checks if a provider is registered for the given token */
  has(token: Token): boolean;
  /**
   * Resolves all instances registered for a multi-provider token.
   * Returns an empty array if no providers are registered.
   */
  getAll<T>(token: Token<T>): T[];
}

/**
 * Type-safe metadata storage with overloads for known and dynamic keys.
 *
 * Provides compile-time type checking for predefined metadata keys while
 * allowing runtime access to arbitrary string keys. Used primarily in
 * {@link InjectionContext} to pass typed data through the resolution chain.
 *
 * @template TMetadata - Object type defining known metadata keys and their value types
 *
 * @example
 * ```ts
 * interface MyMetadata {
 *   userId: string;
 *   timestamp: number;
 * }
 *
 * const metadata: TypedMetadataMap<MyMetadata> = new Map();
 * metadata.set('userId', '123'); // Typed
 * metadata.set('custom', 'value'); // Untyped fallback
 * ```
 */
export interface TypedMetadataMap<TMetadata extends object = Record<string, unknown>> {
  /** Gets a value for a known metadata key with type safety */
  get<K extends keyof TMetadata>(key: K): TMetadata[K];
  /** Gets a value for an unknown key, returning `unknown` */
  get(key: string): unknown;
  /** Sets a value for a known metadata key with type checking */
  set<K extends keyof TMetadata>(key: K, value: TMetadata[K]): this;
  /** Sets a value for an unknown key */
  set(key: string, value: unknown): this;
  has(key: keyof TMetadata | string): boolean;
  delete(key: keyof TMetadata | string): boolean;
  clear(): void;
  forEach(callbackfn: (value: unknown, key: string, map: Map<string, unknown>) => void): void;
  readonly size: number;
  entries(): IterableIterator<[string, unknown]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<unknown>;
  [Symbol.iterator](): IterableIterator<[string, unknown]>;
}

/**
 * Carries state and metadata through a single dependency resolution step.
 *
 * Created automatically by the container during resolution and passed to
 * interceptors, middleware, and factory functions. Contains information about
 * the current resolution including the dependency graph path for cycle detection.
 *
 * @template TMetadata - Object type defining known metadata keys and their value types
 *
 * @example
 * ```ts
 * const interceptor: InterceptorFn = (context, next) => {
 *   console.log(`Resolving at depth ${context.depth}`);
 *   console.log(`Path: ${context.path.map(tokenToString).join(' -> ')}`);
 *   return next();
 * };
 * ```
 */
export interface InjectionContext<TMetadata extends object = Record<string, unknown>> {
  container: ContainerLike;
  /** Token being resolved. Undefined for root-level resolutions */
  token?: Token;
  /** Identifier for request-scoped instances. Share the same requestId to share instances */
  requestId?: string | symbol;
  /** Type-safe metadata storage for passing custom data through resolution */
  metadata: TypedMetadataMap<TMetadata>;
  /**
   * Current nesting level in the dependency graph.
   * Increments with each nested resolution, used for cycle detection.
   */
  depth: number;
  /**
   * Sequence of tokens from root to current resolution.
   * Used for circular dependency detection and error reporting.
   */
  path: Token[];
  strategy: ResolutionStrategy;
}
