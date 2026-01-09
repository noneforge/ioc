import type { Constructor, Factory, Token } from './common.types';
import type { InjectionContext } from './context.types';
import type { InterceptorLike } from './interceptor.types';
import type { ProviderScope } from './scope.types';

/**
 * Base interface providing common configuration shared across all provider types.
 * Extended by {@link ClassProvider}, {@link ValueProvider}, {@link FactoryProvider},
 * {@link ExistingProvider}, and {@link AsyncProvider}.
 *
 * @template _T - Provider value type (unused but kept for type consistency across provider interfaces)
 * @template TMetadata - Metadata type passed to the `when` callback for typed context access
 *
 * @example
 * ```ts
 * // Conditional provider based on environment
 * const provider: ClassProvider = {
 *   provide: Logger,
 *   useClass: ConsoleLogger,
 *   when: (ctx) => ctx.metadata.environment === 'development',
 *   tags: ['logging']
 * };
 *
 * // Multi-provider for extensibility
 * const plugins: FactoryProvider = {
 *   provide: 'PLUGINS',
 *   useFactory: () => new AnalyticsPlugin(),
 *   multi: true // Allows multiple providers for the same token
 * };
 * ```
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface BaseProvider<_T = unknown, TMetadata extends object = Record<string, unknown>> {
  /**
   * Enables multiple providers for the same token. The container returns an array of all matching providers.
   * Useful for plugin systems and extensibility points.
   *
   * @default false
   */
  multi?: boolean;
  /**
   * Conditional predicate to control provider resolution based on injection context.
   * Provider is only used when this returns `true`. Useful for environment-specific or feature-flagged providers.
   */
  when?: (context: InjectionContext<TMetadata>) => boolean;
  /**
   * Interceptors to apply during resolution for cross-cutting concerns like logging, caching, or validation.
   * Executed in array order, wrapping the actual resolution logic.
   */
  interceptors?: InterceptorLike[];
  /** Arbitrary metadata attached to the provider. Accessible in interceptors and `when` callbacks. */
  metadata?: Record<string, unknown>;
  /** Tags for categorizing and querying providers. Useful for filtering providers by domain or feature. */
  tags?: string[];
}

/**
 * Provider that instantiates a class using its constructor and dependency injection.
 * The container resolves constructor dependencies automatically via `reflect-metadata`.
 *
 * @template T - Instance type created by the constructor
 * @template TMetadata - Metadata type for the `when` callback
 *
 * @example
 * ```ts
 * // Basic class provider
 * container.register({ provide: UserService, useClass: UserService });
 *
 * // Abstract class with concrete implementation
 * container.register({ provide: Logger, useClass: ConsoleLogger, scope: 'singleton' });
 *
 * // Forward reference for circular dependencies
 * container.register({
 *   provide: ServiceA,
 *   useClass: forwardRef(() => ServiceAImpl),
 *   lazy: true // Creates proxy that resolves on first access
 * });
 * ```
 */
export interface ClassProvider<
  T extends object = object,
  TMetadata extends object = Record<string, unknown>,
> extends BaseProvider<T, TMetadata> {
  provide: Token<T>;
  /**
   * Class constructor to instantiate. Use `forwardRef()` for circular dependencies.
   * Constructor dependencies are resolved automatically via decorator metadata.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useClass: Constructor<T> | ForwardRef<any>;
  /**
   * Lifecycle scope controlling instance caching behavior.
   *
   * @default 'singleton'
   */
  scope?: ProviderScope;
  /**
   * When `true`, returns a proxy that defers instantiation until first property access.
   * Useful for breaking circular dependencies or improving startup performance.
   *
   * @default false
   */
  lazy?: boolean;
}

/**
 * Provider that registers a pre-existing value directly without instantiation or factory logic.
 * Always singleton-scoped. Use for configuration, constants, or pre-initialized objects.
 *
 * @template T - Type of the value
 * @template TMetadata - Metadata type for the `when` callback
 *
 * @example
 * ```ts
 * // Configuration values
 * container.register({ provide: 'API_URL', useValue: 'https://api.example.com' });
 * container.register({ provide: 'PORT', useValue: 3000 });
 *
 * // Pre-configured objects
 * const db = new Database({ host: 'localhost' });
 * container.register({ provide: Database, useValue: db });
 * ```
 */
export interface ValueProvider<
  T = unknown,
  TMetadata extends object = Record<string, unknown>,
> extends BaseProvider<T, TMetadata> {
  provide: Token<T>;
  /** The value to register. No instantiation or initialization occurs; the value is used as-is. */
  useValue: T;
}

/**
 * Provider that uses a factory function to create dependencies dynamically.
 * The factory receives injected dependencies as arguments. Supports async factories returning `Promise<T>`.
 *
 * @template T - Type returned by the factory
 * @template TMetadata - Metadata type for the `when` callback
 *
 * @example
 * ```ts
 * // Factory with dependencies
 * container.register({
 *   provide: 'DATABASE_URL',
 *   useFactory: (config: Config) => config.databaseUrl,
 *   inject: [Config]
 * });
 *
 * // Async factory
 * container.register({
 *   provide: Database,
 *   useFactory: async (url: string) => {
 *     const db = new Database();
 *     await db.connect(url);
 *     return db;
 *   },
 *   inject: ['DATABASE_URL'],
 *   scope: 'singleton'
 * });
 *
 * // Factory with forward references
 * container.register({
 *   provide: ServiceA,
 *   useFactory: (b: ServiceB) => new ServiceA(b),
 *   inject: [forwardRef(() => ServiceB)]
 * });
 * ```
 */
export interface FactoryProvider<
  T = unknown,
  TMetadata extends object = Record<string, unknown>,
> extends BaseProvider<T, TMetadata> {
  provide: Token<T>;
  /** Factory function that creates the value. Can return `Promise<T>` for async initialization. */
  useFactory: Factory<T>;
  /**
   * Tokens to inject as factory arguments. Resolved in order and passed to the factory.
   * Use `forwardRef()` for circular dependencies.
   */
  inject?: (Token | ForwardRef)[];
  /**
   * Lifecycle scope controlling instance caching behavior.
   * @default 'singleton'
   */
  scope?: ProviderScope;
  /**
   * When `true`, returns a proxy that defers factory execution until first property access.
   * @default false
   */
  lazy?: boolean;
}

/**
 * Provider that creates an alias to an existing token.
 * Resolves to the same instance as the target token without creating a new instance.
 *
 * @template T - Type of the aliased value
 * @template TMetadata - Metadata type for the `when` callback
 *
 * @example
 * ```ts
 * // Create an alias for an abstract class
 * container.register({ provide: Logger, useClass: ConsoleLogger });
 * container.register({ provide: 'LOGGER', useExisting: Logger }); // Alias to same instance
 *
 * // Multiple tokens for the same service
 * container.register({ provide: UserRepository, useClass: MongoUserRepository });
 * container.register({ provide: 'IUserRepo', useExisting: UserRepository });
 *
 * // Forward reference for circular dependencies
 * container.register({
 *   provide: 'SERVICE_ALIAS',
 *   useExisting: forwardRef(() => RealService)
 * });
 * ```
 */
export interface ExistingProvider<
  T = unknown,
  TMetadata extends object = Record<string, unknown>,
> extends BaseProvider<T, TMetadata> {
  provide: Token<T>;
  /**
   * Token to resolve and return. Both tokens will share the same instance.
   * Use `forwardRef()` for circular dependencies.
   */
  useExisting: Token<T> | ForwardRef<T>;
}

/**
 * Provider for asynchronous initialization without explicit dependencies.
 * The factory must return a Promise. For factories with dependencies, use {@link FactoryProvider} instead.
 *
 * @template T - Type of the resolved value
 * @template TMetadata - Metadata type for the `when` callback
 *
 * @example
 * ```ts
 * // Async initialization without dependencies
 * container.register({
 *   provide: 'CONFIG',
 *   useAsync: async () => {
 *     const response = await fetch('/api/config');
 *     return response.json();
 *   }
 * });
 *
 * // Async resource initialization
 * container.register({
 *   provide: Database,
 *   useAsync: async () => {
 *     const db = new Database();
 *     await db.connect();
 *     return db;
 *   },
 *   scope: 'singleton'
 * });
 * ```
 */
export interface AsyncProvider<
  T = unknown,
  TMetadata extends object = Record<string, unknown>,
> extends BaseProvider<T, TMetadata> {
  provide: Token<T>;
  /**
   * Async factory function returning a Promise.
   * Called without arguments; use FactoryProvider for dependency injection.
   */
  useAsync: () => Promise<T>;
  /**
   * Lifecycle scope controlling instance caching behavior.
   * @default 'singleton'
   */
  scope?: ProviderScope;
}

/**
 * Union of all supported provider types.
 * Accepts a constructor directly (shorthand for ClassProvider) or any explicit provider configuration.
 *
 * @template T - Type of the provided value
 * @template TMetadata - Metadata type for typed context in `when` callbacks
 *
 * @example
 * ```ts
 * // Constructor shorthand
 * const provider1: Provider = UserService;
 *
 * // Explicit provider configurations
 * const provider2: Provider = { provide: Logger, useClass: ConsoleLogger };
 * const provider3: Provider = { provide: 'PORT', useValue: 3000 };
 * const provider4: Provider = { provide: 'DB_URL', useFactory: () => process.env.DB_URL };
 * const provider5: Provider = { provide: 'REPO', useExisting: UserRepository };
 * const provider6: Provider = { provide: 'CONFIG', useAsync: async () => fetchConfig() };
 * ```
 */
export type Provider<T = unknown, TMetadata extends object = Record<string, unknown>> =
  | Constructor<T & object>
  | ClassProvider<T & object, TMetadata>
  | ValueProvider<T, TMetadata>
  | FactoryProvider<T, TMetadata>
  | ExistingProvider<T, TMetadata>
  | AsyncProvider<T, TMetadata>;

/**
 * Forward reference wrapper for handling circular dependencies.
 * Delays token resolution until runtime by wrapping it in a function. Created via the `forwardRef()` helper.
 *
 * @template T - Instance type of the resolved dependency
 *
 * @example
 * ```ts
 * // ServiceA depends on ServiceB, ServiceB depends on ServiceA
 * class ServiceA {
 *   constructor(@Inject(forwardRef(() => ServiceB)) private b: ServiceB) {}
 * }
 *
 * class ServiceB {
 *   constructor(private a: ServiceA) {} // No forward ref needed here
 * }
 *
 * // In providers
 * container.register({
 *   provide: ServiceA,
 *   useFactory: (b: ServiceB) => new ServiceA(b),
 *   inject: [forwardRef(() => ServiceB)]
 * });
 * ```
 *
 * @see {@link https://github.com/noneforge/ioc/blob/main/docs/forward-refs.md | Forward References Guide}
 */
export interface ForwardRef<T = unknown> {
  /** Getter function returning the token. Invoked at resolution time to break circular references. */
  forwardRef: () => Token<T>;
  /** Discriminator property for type narrowing and runtime detection. Always `true`. */
  __forward_ref__: true;
}
