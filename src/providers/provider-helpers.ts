import type { Constructor, Factory, InjectionContext, Provider, ProviderScope, Token } from '../types';
import { isConstructor } from '../utils';

/**
 * Creates a provider only when a condition is met.
 *
 * Returns `null` when the condition is false, allowing conditional provider registration
 * without cluttering the providers array with undefined checks.
 *
 * @example
 * ```ts
 * providers: [
 *   provideIf(config.enableCache, { provide: CacheService, useClass: RedisCacheService }),
 *   provideIf(() => !isProduction(), { provide: DebugService, useClass: VerboseDebugService })
 * ].filter(Boolean)
 * ```
 */
export function provideIf<T>(condition: boolean | (() => boolean), provider: Provider<T>): Provider<T> | null {
  const shouldProvide = typeof condition === 'function' ? condition() : condition;

  return shouldProvide ? provider : null;
}

/**
 * Creates a provider only for a specific environment.
 *
 * Uses `process.env.NODE_ENV` to determine the current environment. Returns `null`
 * when the environment doesn't match, making it safe to use in non-Node environments.
 *
 * @param env - Target environment to match against NODE_ENV
 * @param provider - Provider to register if the environment matches
 *
 * @example
 * ```ts
 * providers: [
 *   provideForEnvironment('development', { provide: Logger, useClass: VerboseLogger }),
 *   provideForEnvironment('production', { provide: Logger, useClass: SilentLogger })
 * ].filter(Boolean)
 * ```
 */
export function provideForEnvironment<T>(env: 'development' | 'production' | 'test', provider: Provider<T>): Provider<T> | null {
  const currentEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : 'development';

  return currentEnv === env ? provider : null;
}

/**
 * Creates a provider with automatic type detection.
 *
 * Automatically determines whether to use `useClass`, `useFactory`, or `useValue` based
 * on the implementation type. Regular functions become factories, constructors become
 * class providers, and primitives/objects become value providers.
 *
 * @param token - Injection token (class, string, symbol, etc.)
 * @param implementation - Class constructor, factory function, or concrete value
 * @param options - Additional provider options
 * @param options.scope - Lifecycle scope (singleton, transient, or request)
 * @param options.multi - When true, allows multiple providers for the same token
 * @param options.when - Conditional predicate for context-based resolution
 * @param options.tags - Metadata tags for filtering and querying
 *
 * @example
 * ```ts
 * // Creates ClassProvider
 * createProvider(UserService, UserService, { scope: 'singleton' })
 *
 * // Creates FactoryProvider
 * createProvider(API_URL, () => process.env.API_URL || 'http://localhost')
 *
 * // Creates ValueProvider
 * createProvider('API_TIMEOUT', 5000)
 * ```
 */
export function createProvider<T>(
  token: Token<T>,
  implementation: T extends object ? Constructor<T> : T | Factory<T>,
  options?: {
    scope?: ProviderScope;
    multi?: boolean;
    when?: (context: InjectionContext) => boolean;
    tags?: string[];
  },
): Provider<T> {
  if (typeof implementation === 'function' && !isConstructor(implementation)) {
    return {
      provide: token,
      useFactory: implementation as Factory<T>,
      scope: options?.scope,
      multi: options?.multi,
      when: options?.when,
      tags: options?.tags,
    };
  } else if (isConstructor(implementation)) {
    return {
      provide: token,
      useClass: implementation as Constructor,
      scope: options?.scope,
      multi: options?.multi,
      when: options?.when,
      tags: options?.tags,
    } as Provider<T>;
  } else {
    return {
      provide: token,
      useValue: implementation,
      multi: options?.multi,
      when: options?.when,
      tags: options?.tags,
    } as Provider<T>;
  }
}

/**
 * Creates a provider with asynchronous initialization.
 *
 * Use for services that require async setup like database connections, external API clients,
 * or configuration loading. The factory is invoked during container bootstrap, and resolution
 * blocks until the promise resolves.
 *
 * @param token - Injection token (class, string, symbol, etc.)
 * @param factory - Async factory function returning a promise of the service instance
 * @param options - Additional provider options
 * @param options.scope - Lifecycle scope (singleton, transient, or request)
 * @param options.when - Conditional predicate for context-based resolution
 * @param options.tags - Metadata tags for filtering and querying
 *
 * @example
 * ```ts
 * createAsyncProvider(
 *   DatabaseConnection,
 *   async () => {
 *     const db = await connectToDatabase(config.dbUrl);
 *     await db.migrate();
 *     return db;
 *   },
 *   { scope: 'singleton' }
 * )
 * ```
 */
export function createAsyncProvider<T>(
  token: Token<T>,
  factory: () => Promise<T>,
  options?: {
    scope?: ProviderScope;
    when?: (context: InjectionContext) => boolean;
    tags?: string[];
  },
): Provider<T> {
  return {
    provide: token,
    useAsync: factory,
    scope: options?.scope,
    when: options?.when,
    tags: options?.tags,
  } as Provider<T>;
}
