import 'reflect-metadata';

import { EnhancedCache } from '../cache';
import { METADATA } from '../constants';
import { CircularDependencyError, NoProviderError, ValidationError } from '../errors';
import { InterceptorChain } from '../interceptors';
import { MiddlewareRunner } from '../middleware';
import { createLazyProxy } from '../resolution';
import type {
  AsyncProvider,
  ClassProvider,
  Constructor,
  ExistingProvider,
  FactoryProvider,
  ForwardRef,
  InjectionContext,
  InterceptorLike,
  Middleware,
  Provider,
  ProviderScope,
  Token,
  ValueProvider,
} from '../types';
import {
  hasOnDestroy,
  hasOnInit,
  isConstructor,
  isDefined,
  isFalsy,
  resolveForwardRef,
  tokenToString,
} from '../utils';
import { DependencyGraph } from './dependency-graph';
import { InjectionContextManager } from './injection-context';
import { GlobalProviderRegistry } from './provider-registry';
import { RequestContext } from './request-context';

/** Provider object types for type narrowing */
type ProviderObject<T extends object = object> =
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>
  | AsyncProvider<T>;

/**
 * Configuration options for the DI container
 * @template TMetadata - Type of metadata available in injection contexts and conditional provider callbacks
 */
export interface ContainerOptions<TMetadata extends object = Record<string, unknown>> {
  /**
   * Throw error when provider not found instead of returning null
   * @default false
   */
  strict?: boolean;
  /**
   * Enable lazy loading for all providers by default
   * @default false
   */
  lazyLoad?: boolean;
  /**
   * Enable debug logging for resolution errors and lifecycle events
   * @default false
   */
  debug?: boolean;
  /**
   * Maximum number of singleton instances to cache (LRU eviction)
   * @default 1000
   */
  maxCacheSize?: number;
  /**
   * Automatically dispose singletons when container is disposed
   * @default false
   */
  autoDispose?: boolean;
  /**
   * Default metadata available in all injection contexts
   * @default {}
   */
  defaultMetadata?: TMetadata;
}

/**
 * Options for controlling dependency resolution behavior
 */
export interface ContainerGetOptions {
  /**
   * Return null instead of throwing if provider not found
   * @default false
   */
  optional?: boolean;
  /**
   * Skip current container and resolve from parent
   * @default false
   */
  skipSelf?: boolean;
  /**
   * Only resolve from current container, don't check parent
   * @default false
   */
  self?: boolean;
  /**
   * Create lazy proxy that resolves on first access
   * @default false
   */
  lazy?: boolean;
  /**
   * Alias for lazy
   * @default false
   */
  proxy?: boolean;
  /**
   * Request ID for request-scoped providers
   * @default undefined
   */
  requestId?: string | symbol;
  /**
   * Additional metadata passed to injection context
   * @default undefined
   */
  metadata?: Record<string, unknown>;
}

/**
 * Runtime statistics collected by the container during dependency resolution
 */
export interface ContainerStatistics {
  /** Total number of resolution attempts via get() or getAsync() */
  resolutions: number;
  /** Number of new instances created (not retrieved from cache) */
  creates: number;
  /** Number of times a cached instance was returned (singleton or request-scoped) */
  cacheHits: number;
  /** Number of resolution failures (errors thrown during get/getAsync) */
  errors: number;
}

/**
 * Result of container dependency validation
 * @see Container.validate
 */
export interface ContainerValidationResult {
  /** Whether the container has no validation errors */
  valid: boolean;
  /** Validation errors (circular dependencies, missing providers, etc.) */
  errors: string[];
  /** Non-critical validation warnings */
  warnings: string[];
}

/**
 * Dependency injection container supporting multiple provider types, scopes, interceptors, and async resolution.
 * Handles singleton and request-scoped caching, circular dependency detection, and lifecycle hooks.
 *
 * @template TMetadata - Type of metadata available in injection contexts and conditional provider callbacks
 */
export class Container<TMetadata extends object = Record<string, unknown>> {
  private readonly providers = new Map<Token, Provider[]>();
  private readonly requestContexts = new Map<string | symbol, RequestContext>();
  private readonly singletons: EnhancedCache<Token, object>;
  private readonly options: ContainerOptions<TMetadata>;
  private readonly resolutionStack: Token[] = [];
  private readonly parent?: Container<TMetadata>;
  private readonly interceptorChain = new InterceptorChain();
  private readonly middlewareRunner = new MiddlewareRunner();
  private readonly dependencyGraph = new DependencyGraph();
  private readonly statistics: ContainerStatistics = {
    resolutions: 0,
    creates: 0,
    cacheHits: 0,
    errors: 0,
  };

  /**
   * Creates a new container with providers, optional parent container, and configuration.
   * Automatically registers providers from GlobalProviderRegistry (marked with `providedIn: 'root'`).
   *
   * @param providers - Initial providers to register
   * @param parent - Parent container for hierarchical resolution
   * @param options - Configuration including caching, debugging, and default metadata
   */
  constructor(
    providers: Provider<unknown, TMetadata>[] = [],
    parent?: Container<TMetadata>,
    options: ContainerOptions<TMetadata> = {},
  ) {
    this.parent = parent;
    this.options = options;

    this.singletons = new EnhancedCache<Token, object>({
      maxSize: 1000,
      evictionPolicy: 'lru',
      onDisposeError: (error, token) => {
        if (this.options.debug === true) {
          console.error(`Failed to dispose singleton ${tokenToString(token)}:`, error);
        }
      },
    });

    const globalProviders = GlobalProviderRegistry.getAllProviders() as Provider<unknown, TMetadata>[];
    [...globalProviders, ...providers].forEach((provider) => {
      this.addProvider(provider);
    });

    if (parent) {
      for (const middleware of parent.getMiddlewares()) {
        this.middlewareRunner.add(middleware);
      }
    }
  }

  /**
   * Registers a provider in the container. Multiple providers can be registered for the same token.
   * Validates provider structure before registration.
   *
   * @throws {ValidationError} If provider is malformed or missing required properties
   */
  addProvider(provider: Provider<unknown, TMetadata>): void {
    const baseProvider = provider as Provider;

    this.validateProvider(baseProvider);

    const token = isConstructor(baseProvider) ? baseProvider : (baseProvider as { provide: Token }).provide;
    const resolved = resolveForwardRef(token);

    const existing = this.providers.get(resolved) ?? [];
    existing.push(baseProvider);
    this.providers.set(resolved, existing);
  }

  /**
   * Adds a middleware that runs on every resolution.
   * Middleware execute in priority order (lower priority values run first).
   *
   * @param middleware - Middleware with optional pre/post hooks
   *
   * @example
   * ```ts
   * container.use({
   *   priority: 50,
   *   pre: (ctx) => console.log(`Resolving: ${String(ctx.token)}`),
   *   post: (ctx, instance) => {
   *     console.log(`Resolved: ${String(ctx.token)}`);
   *     return instance;
   *   }
   * });
   * ```
   */
  use(middleware: Middleware): void {
    this.middlewareRunner.add(middleware);
  }

  /**
   * Returns a copy of registered middlewares.
   * Used internally for child container inheritance.
   */
  getMiddlewares(): readonly Middleware[] {
    return this.middlewareRunner.getMiddlewares();
  }

  private validateProvider<T>(provider: Provider<T>): void {
    if (isConstructor(provider)) {
      return;
    }

    if (typeof provider !== 'object') {
      throw new ValidationError('unknown', provider, 'Provider must be a constructor or provider object');
    }

    if (!('provide' in provider)) {
      throw new ValidationError('unknown', provider, 'Provider object must have a "provide" property');
    }

    const providerObj = provider as ProviderObject;
    const token = providerObj.provide;
    const keys = Object.keys(provider);
    const providerKeys = ['useClass', 'useValue', 'useFactory', 'useExisting', 'useAsync'];
    const hasProviderKey = providerKeys.filter((key) => keys.includes(key));

    if (hasProviderKey.length === 0) {
      throw new ValidationError(token, provider, `Provider must have one of: ${providerKeys.join(', ')}`);
    }

    if (hasProviderKey.length > 1) {
      throw new ValidationError(token, provider, `Provider can only have one of: ${hasProviderKey.join(', ')}`);
    }

    if ('useFactory' in providerObj && typeof providerObj.useFactory !== 'function') {
      throw new ValidationError(token, provider, 'useFactory must be a function');
    }

    if ('useAsync' in providerObj && typeof providerObj.useAsync !== 'function') {
      throw new ValidationError(token, provider, 'useAsync must be a function');
    }

    if ('useClass' in providerObj) {
      const useClass = providerObj.useClass;
      const isForwardRef = typeof useClass === 'object' && 'forwardRef' in useClass;

      if (!isConstructor(useClass) && !isForwardRef) {
        throw new ValidationError(token, provider, 'useClass must be a constructor or forward reference');
      }
    }
  }

  /**
   * Checks if a provider is registered for the token in this container or parent chain
   */
  hasProvider<T>(token: Token<T>): boolean {
    const resolved = resolveForwardRef(token);

    return this.providers.has(resolved) || (this.parent?.hasProvider(resolved) ?? false);
  }

  /**
   * Resolves a dependency synchronously. Returns cached instance for singletons and request-scoped providers.
   *
   * @param token - Class, string, or symbol identifying the dependency
   * @param options - Control lazy loading, hierarchy traversal, request scope, and optionality
   * @returns The resolved instance (may be cached) or proxy if `lazy: true`
   * @throws {CircularDependencyError} If resolution creates a cycle
   * @throws {NoProviderError} If no provider found and not optional
   */
  get<T>(token: Token<T>, options?: ContainerGetOptions): T {
    this.statistics.resolutions += 1;

    if (options?.lazy === true || options?.proxy === true) {
      return createLazyProxy<T>(this, token, options);
    }

    try {
      return this.resolve(token, options);
    } catch (error) {
      this.statistics.errors += 1;

      if (this.options.debug === true) {
        console.error(`Resolution failed for ${tokenToString(token)}:`, error);
      }

      throw error;
    }
  }

  /**
   * Resolves a dependency asynchronously. Supports async providers (`useAsync`) and async dependency chains.
   * Returns cached instance for singletons and request-scoped providers.
   *
   * @param token - Class, string, or symbol identifying the dependency
   * @param options - Control lazy loading, hierarchy traversal, request scope, and optionality
   * @returns Promise resolving to the instance or proxy if `lazy: true`
   * @throws {CircularDependencyError} If resolution creates a cycle
   * @throws {NoProviderError} If no provider found and not optional
   */
  async getAsync<T>(token: Token<T>, options?: ContainerGetOptions): Promise<T> {
    this.statistics.resolutions += 1;

    if (options?.lazy === true || options?.proxy === true) {
      return createLazyProxy<T>(this, token, options);
    }

    try {
      return await this.resolveAsync(token, options);
    } catch (error) {
      this.statistics.errors += 1;

      if (this.options.debug === true) {
        console.error(`Async resolution failed for ${tokenToString(token)}:`, error);
      }

      throw error;
    }
  }

  /**
   * Resolves all multi-providers registered for a token (providers with `multi: true`).
   * Regular providers are ignored.
   *
   * @returns Array of instances from all multi-providers for the token
   */
  getAll<T>(token: Token<T>): T[] {
    const resolved = resolveForwardRef(token);
    const providers = this.providers.get(resolved) ?? [];
    const multiProviders = providers.filter((p) => typeof p === 'object' && 'multi' in p && p.multi === true);

    return multiProviders.map((provider) => this.createInstance(provider)) as T[];
  }

  /** Checks if a provider exists in this container or global registry (doesn't check parent) */
  has(token: Token): boolean {
    const resolved = resolveForwardRef(token);

    return this.providers.has(resolved) || GlobalProviderRegistry.has(resolved);
  }

  private resolve<T>(token: Token<T>, options?: ContainerGetOptions): T {
    const resolved = resolveForwardRef(token);
    const mergedMetadata = {
      ...this.options.defaultMetadata,
      ...options?.metadata,
    };

    const context: InjectionContext = {
      container: this,
      token: resolved,
      requestId: options?.requestId,
      metadata: new Map(Object.entries(mergedMetadata)),
      depth: this.resolutionStack.length,
      path: [...this.resolutionStack],
      strategy: options?.lazy === true ? 'lazy' : 'default',
    };

    return InjectionContextManager.run<T>(context, (): T => {
      if (this.resolutionStack.includes(resolved)) {
        const cycle = [...this.resolutionStack, resolved];

        throw new CircularDependencyError(cycle, context);
      }

      if (options?.skipSelf === true && this.parent !== undefined) {
        return this.parent.resolve<T>(resolved, options);
      }

      const provider = this.findProvider(resolved, context);
      if (provider === null) {
        if (this.parent !== undefined && options?.self !== true) {
          return this.parent.resolve<T>(resolved, options);
        }

        if (options?.optional === true) {
          return null as T;
        }

        throw new NoProviderError(resolved, context);
      }

      const scope = this.getScope(provider);
      const cached = this.getCachedInstance(resolved, scope, options);

      if (cached !== undefined) {
        this.statistics.cacheHits += 1;

        return cached as T;
      }

      this.resolutionStack.push(resolved);

      try {
        this.middlewareRunner.runPreSync(context);

        const chain = this.getInterceptorChain(provider);
        let instance = chain.execute<T>(context, () => {
          return this.createInstance<T>(provider as Provider<T>, options);
        });

        instance = this.middlewareRunner.runPostSync(context, instance);

        if (typeof instance === 'object' && instance !== null) {
          this.cacheInstance(resolved, instance as object, scope, provider, options);
        }

        this.runLifecycleHooks(instance, context);

        return instance;
      } finally {
        this.resolutionStack.pop();
      }
    });
  }

  private async resolveAsync<T>(token: Token<T>, options?: ContainerGetOptions): Promise<T> {
    const resolved = resolveForwardRef(token);
    const mergedMetadata = {
      ...this.options.defaultMetadata,
      ...options?.metadata,
    };

    const context: InjectionContext = {
      container: this,
      token: resolved,
      requestId: options?.requestId,
      metadata: new Map(Object.entries(mergedMetadata)),
      depth: this.resolutionStack.length,
      path: [...this.resolutionStack],
      strategy: options?.lazy === true ? 'lazy' : 'async',
    };

    return InjectionContextManager.runAsync<T>(context, async (): Promise<T> => {
      if (this.resolutionStack.includes(resolved)) {
        const cycle = [...this.resolutionStack, resolved];

        throw new CircularDependencyError(cycle, context);
      }

      if (options?.skipSelf === true && this.parent !== undefined) {
        return this.parent.resolveAsync<T>(resolved, options);
      }

      const provider = this.findProvider(resolved, context);
      if (provider === null) {
        if (this.parent !== undefined && options?.self !== true) {
          return this.parent.resolveAsync<T>(resolved, options);
        }

        if (options?.optional === true) {
          return null as T;
        }

        throw new NoProviderError(resolved, context);
      }

      const scope = this.getScope(provider);
      const cached = this.getCachedInstance(resolved, scope, options);

      if (cached !== undefined) {
        this.statistics.cacheHits += 1;

        return cached as T;
      }

      this.resolutionStack.push(resolved);

      try {
        await this.middlewareRunner.runPre(context);

        const chain = this.getInterceptorChain(provider);
        let instance = await chain.executeAsync<T>(context, async () => {
          return this.createInstanceAsync<T>(provider as Provider<T>, options);
        });

        instance = await this.middlewareRunner.runPost(context, instance);

        if (typeof instance === 'object' && instance !== null) {
          this.cacheInstance(resolved, instance as object, scope, provider, options);
        }

        await this.runLifecycleHooksAsync(instance, context);

        return instance;
      } finally {
        this.resolutionStack.pop();
      }
    });
  }

  private createInstance<T>(provider: Provider<T>, options?: ContainerGetOptions): T {
    this.statistics.creates += 1;

    if (isConstructor(provider)) {
      return this.instantiate(provider as Constructor) as T;
    }

    if ('useClass' in provider) {
      const Class = resolveForwardRef(provider.useClass as Constructor | ForwardRef<Constructor>) as Constructor;

      return this.instantiate(Class) as T;
    }

    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useFactory' in provider) {
      const deps = this.resolveDependencies(provider.inject ?? []);

      return provider.useFactory(...deps) as T;
    }

    if ('useExisting' in provider) {
      const existing = resolveForwardRef(provider.useExisting);

      return this.resolve(existing, options);
    }

    if ('useAsync' in provider) {
      throw new Error('Async providers require getAsync() method');
    }

    throw new Error(`Invalid provider: ${JSON.stringify(provider)}`);
  }

  private async createInstanceAsync<T>(provider: Provider<T>, options?: ContainerGetOptions): Promise<T> {
    this.statistics.creates += 1;

    if (isConstructor(provider)) {
      return await this.instantiateAsync(provider as Constructor) as T;
    }

    if ('useClass' in provider) {
      const Class = resolveForwardRef(provider.useClass as Constructor | ForwardRef<Constructor>) as Constructor;

      return await this.instantiateAsync(Class) as T;
    }

    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useFactory' in provider) {
      const deps = await this.resolveDependenciesAsync(provider.inject ?? []);
      const result = provider.useFactory(...deps);

      return Promise.resolve(result);
    }

    if ('useExisting' in provider) {
      const existing = resolveForwardRef(provider.useExisting);

      return this.resolveAsync(existing, options);
    }

    if ('useAsync' in provider) {
      return provider.useAsync();
    }

    throw new Error(`Invalid provider: ${JSON.stringify(provider)}`);
  }

  private instantiate<T extends object>(Constructor: Constructor<T>): T {
    const paramTypes = (Reflect.getMetadata('design:paramtypes', Constructor) as unknown[] | undefined) ?? [];
    const injectTokens = (Reflect.getMetadata(METADATA.INJECT_TOKENS, Constructor) as unknown[] | undefined) ?? [];
    const optionalTokens = (Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, Constructor) as unknown[] | undefined) ?? [];

    const deps = paramTypes.map((type: unknown, index: number) => {
      const token = injectTokens[index] ?? type;
      if (isFalsy(token)) {
        return undefined;
      }

      try {
        const resolved = resolveForwardRef(token);

        return this.resolve(resolved);
      } catch (error) {
        const optional = optionalTokens[index];
        if (isDefined(optional)) {
          return null;
        }

        throw error;
      }
    });

    return new Constructor(...deps);
  }

  private async instantiateAsync<T extends object>(Constructor: Constructor<T>): Promise<T> {
    const paramTypes = (Reflect.getMetadata('design:paramtypes', Constructor) as unknown[] | undefined) ?? [];
    const injectTokens = (Reflect.getMetadata(METADATA.INJECT_TOKENS, Constructor) as unknown[] | undefined) ?? [];
    const optionalTokens = (Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, Constructor) as unknown[] | undefined) ?? [];

    const deps = await Promise.all(paramTypes.map(async (type: unknown, index: number) => {
      const token = injectTokens[index] ?? type;
      if (isFalsy(token)) {
        return undefined;
      }

      try {
        const resolved = resolveForwardRef(token);

        return await this.resolveAsync(resolved);
      } catch (error) {
        const optional = optionalTokens[index];
        if (isDefined(optional)) {
          return null;
        }

        throw error;
      }
    }));

    return new Constructor(...deps);
  }

  private findProvider(token: Token, context: InjectionContext): Provider | null {
    const providers = this.providers.get(token) ?? [];

    for (const provider of providers) {
      if ('when' in provider && typeof provider.when === 'function') {
        if (!provider.when(context)) {
          continue;
        }
      }

      if (!('multi' in provider) || isFalsy(provider.multi)) {
        return provider;
      }
    }

    if (isConstructor(token)) {
      const isInjectable = Reflect.getMetadata(METADATA.INJECTABLE, token) as unknown;
      if (!isFalsy(isInjectable)) {
        return token;
      }
    }

    return providers[0] ?? null;
  }

  private getScope(provider: Provider): ProviderScope {
    if (typeof provider === 'object' && 'scope' in provider) {
      return provider.scope ?? 'singleton';
    }

    if (isConstructor(provider)) {
      const metaScope = Reflect.getMetadata(METADATA.SCOPE, provider) as string | undefined;
      if (metaScope !== undefined) {
        return metaScope as ProviderScope;
      }
    }

    return 'singleton';
  }

  private getCachedInstance(token: Token, scope: ProviderScope, options?: ContainerGetOptions): object | undefined {
    if (scope === 'singleton') {
      return this.singletons.get(token);
    }

    if (scope === 'request' && options?.requestId !== undefined) {
      const context = this.requestContexts.get(options.requestId);

      return context?.getInstance(token);
    }

    return undefined;
  }

  private cacheInstance(
    token: Token,
    instance: object,
    scope: ProviderScope,
    _provider: Provider,
    options?: ContainerGetOptions,
  ): void {
    if (scope === 'singleton') {
      this.singletons.set(token, instance, {
        dispose: async () => {
          if (hasOnDestroy(instance)) {
            await instance.onDestroy();
          }
        },
      });
    }

    if (scope === 'request' && options?.requestId !== undefined) {
      const context = this.getOrCreateRequestContext(options.requestId);
      context.setInstance(token, instance);
    }
  }

  private getInterceptorChain(provider: Provider): InterceptorChain {
    const providerInterceptors = this.getProviderInterceptors(provider);
    if (providerInterceptors.length === 0) {
      return this.interceptorChain;
    }

    return new InterceptorChain([...providerInterceptors]);
  }

  private getProviderInterceptors(provider: Provider): InterceptorLike[] {
    if (isConstructor(provider)) {
      return [];
    }

    return (provider as { interceptors?: InterceptorLike[] }).interceptors ?? [];
  }

  private resolveDependencies(tokens: Token[]): unknown[] {
    return tokens.map((token) => {
      const resolved = resolveForwardRef(token);

      return this.resolve(resolved);
    });
  }

  private async resolveDependenciesAsync(tokens: Token[]): Promise<unknown[]> {
    return Promise.all(tokens.map(async (token) => {
      const resolved = resolveForwardRef(token);

      return this.resolveAsync(resolved);
    }));
  }

  /**
   * Invokes `onInit()` lifecycle hook if present. Swallows promise rejections in sync mode
   * to prevent unhandled rejections (logs to console if debug enabled).
   */
  private runLifecycleHooks(instance: unknown, _context: InjectionContext): void {
    if (hasOnInit(instance)) {
      const result = instance.onInit();
      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          if (this.options.debug === true) {
            console.error('Lifecycle hook error:', error);
          }
        });
      }
    }
  }

  /** Invokes `onInit()` lifecycle hook if present. Awaits promises and propagates errors */
  private async runLifecycleHooksAsync(instance: unknown, _context: InjectionContext): Promise<void> {
    if (hasOnInit(instance)) {
      try {
        const result = instance.onInit();
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        if (this.options.debug === true) {
          console.error('Lifecycle hook error:', error);
        }

        throw error;
      }
    }
  }

  private getOrCreateRequestContext(id: string | symbol): RequestContext {
    let context = this.requestContexts.get(id);
    if (!context) {
      context = new RequestContext(id);
      this.requestContexts.set(id, context);
    }

    return context;
  }

  /**
   * Creates a child container that inherits this container's configuration.
   * Children delegate resolution to parents when providers are not found locally.
   *
   * @param providers - Providers to register in the child container
   */
  createChild(providers: Provider<unknown, TMetadata>[] = []): Container<TMetadata> {
    return new Container<TMetadata>(providers, this, this.options);
  }

  /** Returns the dependency graph for cycle detection and validation */
  getDependencyGraph(): DependencyGraph {
    return this.dependencyGraph;
  }

  /** Returns a copy of runtime statistics (resolutions, cache hits, creates, errors) */
  getStatistics(): ContainerStatistics {
    return { ...this.statistics };
  }

  /**
   * Loads a module by registering its providers and recursively loading imported modules.
   * Module metadata is read from decorators applied by `@Module()`.
   *
   * @param ModuleClass - Class decorated with `@Module()`
   */
  loadModule(ModuleClass: Constructor): void {
    // eslint-disable-next-line @stylistic/max-len
    const providers = (Reflect.getMetadata(METADATA.MODULE_PROVIDERS, ModuleClass) ?? []) as Provider<unknown, TMetadata>[];
    const imports = (Reflect.getMetadata(METADATA.MODULE_IMPORTS, ModuleClass) ?? []) as Constructor[];

    for (const ImportedModule of imports) {
      this.loadModule(ImportedModule);
    }

    for (const provider of providers) {
      this.addProvider(provider);
    }
  }

  /**
   * Validates the container configuration by checking for circular dependencies and missing providers.
   * Does not throw - returns validation result with errors and warnings.
   */
  validate(): ContainerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const cycles = this.dependencyGraph.detectCycles();
    for (const cycle of cycles) {
      errors.push(`Circular dependency: ${cycle.map(tokenToString).join(' -> ')}`);
    }

    const missing = this.dependencyGraph.getMissingDependencies();
    for (const token of missing) {
      const tokenStr = tokenToString(token);
      errors.push(`Required dependency not found: ${tokenStr}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Disposes the container by cleaning up all request contexts and singleton instances.
   * Invokes `onDestroy()` lifecycle hooks on cached singletons.
   * Call this on application shutdown to prevent memory leaks.
   */
  async dispose(): Promise<void> {
    for (const context of this.requestContexts.values()) {
      await context.dispose();
    }

    await this.singletons.clear();

    this.providers.clear();
    this.requestContexts.clear();

    if (this.options.debug === true) {
      console.info('Container disposed');
    }
  }
}

/**
 * Creates a container with providers using rest parameters for convenience
 *
 * @example
 * ```ts
 * const container = createContainer(
 *   DatabaseService,
 *   { provide: 'CONFIG', useValue: config },
 *   UserService
 * );
 * ```
 */
export function createContainer(...providers: Provider[]): Container {
  return new Container(providers);
}
