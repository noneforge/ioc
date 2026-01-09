# API Reference

Complete API documentation for @noneforge/ioc.

## Container

### Constructor

```typescript
new Container<TMetadata>(
  providers?: Provider<unknown, TMetadata>[],
  parent?: Container<TMetadata>,
  options?: ContainerOptions<TMetadata>
)
```

**Type Parameters:**
- `TMetadata` - Type for metadata keys/values, enables autocomplete in `when` callbacks

**Parameters:**
- `providers` - Initial providers to register
- `parent` - Parent container for hierarchical resolution
- `options` - Container configuration options

### ContainerOptions

```typescript
interface ContainerOptions<TMetadata extends object = Record<string, unknown>> {
  strict?: boolean;      // Throw on missing providers (default: false)
  debug?: boolean;       // Enable debug logging (default: false)
  lazyLoad?: boolean;    // Defer instantiation (default: false)
  maxCacheSize?: number; // Maximum singleton cache size
  autoDispose?: boolean; // Auto-dispose on process exit
  defaultMetadata?: TMetadata;  // Default metadata for all resolutions
}
```

The `defaultMetadata` is merged with per-call metadata and available in `when` callbacks:

```typescript
interface MyMetadata {
  environment: 'development' | 'production';
  tenant?: string;
}

const container = new Container<MyMetadata>(providers, undefined, {
  defaultMetadata: { environment: 'production' }
});
```

### createContainer()

```typescript
function createContainer(...providers: Provider[]): Container
```

Factory function to create a new container.

### Methods

#### get()

```typescript
get<T>(token: Token<T>, options?: ContainerGetOptions): T
```

Synchronously resolve a dependency.

**Parameters:**
- `token` - Token to resolve
- `options` - Resolution options

**Returns:** Resolved instance

**Throws:** `NoProviderError` if not found and not optional

#### getAsync()

```typescript
getAsync<T>(token: Token<T>, options?: ContainerGetOptions): Promise<T>
```

Asynchronously resolve a dependency.

#### getAll()

```typescript
getAll<T>(token: Token<T>): T[]
```

Get all instances for a multi-provider token.

#### has()

```typescript
has(token: Token): boolean
```

Check if a provider is registered (includes global registry).

#### hasProvider()

```typescript
hasProvider<T>(token: Token<T>): boolean
```

Check if a provider is registered in this container or parent.

#### addProvider()

```typescript
addProvider(provider: Provider): void
```

Register a provider.

#### loadModule()

```typescript
loadModule(ModuleClass: Constructor): void
```

Load a module and its providers.

#### createChild()

```typescript
createChild(providers?: Provider[]): Container
```

Create a child container.

#### validate()

```typescript
validate(): ValidationResult

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

Validate all providers and dependencies.

#### dispose()

```typescript
dispose(): Promise<void>
```

Dispose container and call `onDestroy` hooks.

#### getStatistics()

```typescript
getStatistics(): ContainerStatistics

interface ContainerStatistics {
  resolutions: number;
  creates: number;
  cacheHits: number;
  errors: number;
}
```

Get resolution statistics.

#### getDependencyGraph()

```typescript
getDependencyGraph(): DependencyGraph
```

Get the dependency graph for analysis and validation.

### ContainerGetOptions

```typescript
interface ContainerGetOptions {
  optional?: boolean;           // Return null if not found
  skipSelf?: boolean;           // Skip this container, search parent
  self?: boolean;               // Only this container, don't search parent
  lazy?: boolean;               // Return lazy proxy
  proxy?: boolean;              // Same as lazy
  requestId?: string | symbol;  // For request scope
  metadata?: Record<string, unknown>;
}
```

> **Note:** `skipSelf` and `self` are mutually exclusive. `skipSelf` is evaluated first.
> Using both together results in searching only the root container.

---

## InjectionToken

### Constructor

```typescript
new InjectionToken<T>(
  description: string,
  options?: InjectionTokenOptions<T>
)
```

### InjectionTokenOptions

```typescript
interface InjectionTokenOptions<T> {
  providedIn?: 'root' | 'platform' | 'any' | null;
  factory?: () => T;
  multi?: boolean;
  scope?: ProviderScope;
  validator?: (value: unknown) => boolean;
  transformer?: (value: any) => T;
}
```

### Methods

#### toString()

```typescript
toString(): string
```

Get string representation.

#### validate()

```typescript
validate(value: unknown): boolean
```

Validate a value (if validator provided).

#### transform()

```typescript
transform(value: any): T
```

Transform a value (if transformer provided).

---

## Providers

### ClassProvider

```typescript
interface ClassProvider<T, TMetadata extends object = Record<string, unknown>> {
  provide: Token<T>;
  useClass: Constructor<T> | ForwardRef<T>;
  scope?: ProviderScope;
  lazy?: boolean;
  multi?: boolean;
  when?: (ctx: InjectionContext<TMetadata>) => boolean;
  interceptors?: InterceptorLike[];
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

### ValueProvider

```typescript
interface ValueProvider<T, TMetadata extends object = Record<string, unknown>> {
  provide: Token<T>;
  useValue: T;
  multi?: boolean;
  when?: (ctx: InjectionContext<TMetadata>) => boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

### FactoryProvider

```typescript
interface FactoryProvider<T, TMetadata extends object = Record<string, unknown>> {
  provide: Token<T>;
  useFactory: (...deps: any[]) => T | Promise<T>;
  inject?: (Token | ForwardRef)[];
  scope?: ProviderScope;
  lazy?: boolean;
  multi?: boolean;
  when?: (ctx: InjectionContext<TMetadata>) => boolean;
  interceptors?: InterceptorLike[];
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

### ExistingProvider

```typescript
interface ExistingProvider<T, TMetadata extends object = Record<string, unknown>> {
  provide: Token<T>;
  useExisting: Token<T> | ForwardRef<T>;
  multi?: boolean;
  when?: (ctx: InjectionContext<TMetadata>) => boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

### AsyncProvider

```typescript
interface AsyncProvider<T, TMetadata extends object = Record<string, unknown>> {
  provide: Token<T>;
  useAsync: () => Promise<T>;
  scope?: ProviderScope;
  multi?: boolean;
  when?: (ctx: InjectionContext<TMetadata>) => boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

> **Note:** Unlike `FactoryProvider`, `AsyncProvider` does not support `inject` for dependencies. Use `FactoryProvider` with async factory if you need dependency injection.

### ProviderScope

```typescript
type ProviderScope =
  | 'singleton'   // One per container
  | 'transient'   // New every time
  | 'request'     // One per requestId
  | 'prototype'   // New with shared prototype
  | 'scoped';     // Custom scope
```

---

## Decorators

### @Injectable()

```typescript
@Injectable(options?: InjectableOptions)

interface InjectableOptions {
  providedIn?: 'root' | 'platform' | 'any' | null;
  scope?: ProviderScope;
  tags?: string[];
}
```

### @Inject()

```typescript
@Inject(token: Token)
```

### @Optional()

```typescript
@Optional()
```

### @Lazy()

```typescript
@Lazy()
```

### @Module()

```typescript
@Module(options: ModuleOptions)

interface ModuleOptions {
  imports?: Constructor[];
  providers?: Provider[];
  exports?: (Token | Constructor)[];
}
```

### AOP Decorators

```typescript
@Cached(ttl?: number)
@Log(tag?: string)
@Transactional()
```

---

## inject() Functions

### inject()

```typescript
function inject<T>(
  token: Token<T> | ForwardRef<T>,
  options?: InjectOptions
): T
```

### injectOptional()

```typescript
function injectOptional<T>(
  token: Token<T> | ForwardRef<T>,
  options?: Omit<InjectOptions, 'optional'>
): T | null
```

### injectLazy()

```typescript
function injectLazy<T>(
  token: Token<T> | ForwardRef<T>,
  options?: Omit<InjectOptions, 'lazy'>
): T & LazyProxy<T>
```

### injectAll()

```typescript
function injectAll<T>(
  token: Token<T> | ForwardRef<T>
): T[]
```

### InjectOptions

```typescript
interface InjectOptions {
  optional?: boolean;   // Return null if not found
  skipSelf?: boolean;   // Skip this container, search parent
  self?: boolean;       // Only this container, don't search parent
  lazy?: boolean;       // Return lazy proxy
  multi?: boolean;      // Get all multi-providers
}
```

> **Note:** `skipSelf` and `self` are mutually exclusive. See [ContainerGetOptions](#getoptions).

### LazyProxy

```typescript
interface LazyProxy<T> {
  readonly value: T;
  readonly isResolved: boolean;
  resolve(): T;
  resolveAsync(): Promise<T>;
  reset(): void;
}
```

---

## Interceptors

### Interceptor Interface

```typescript
interface Interceptor {
  intercept<T>(
    context: InjectionContext,
    next: () => T | Promise<T>
  ): T | Promise<T>;
}
```

### InterceptorFn

Functional interceptor type:

```typescript
type InterceptorFn = (
  context: InjectionContext,
  next: () => unknown
) => unknown;
```

### InterceptorLike

Union type for both class-based and functional interceptors:

```typescript
type InterceptorLike = Interceptor | InterceptorFn;
```

### Interceptor Helpers

#### createInterceptor()

Create an interceptor from pre/post hooks:

```typescript
function createInterceptor(options: CreateInterceptorOptions): InterceptorFn

interface CreateInterceptorOptions {
  pre?: (context: InjectionContext) => void | Promise<void>;
  post?: (context: InjectionContext, result: unknown) => unknown;
}
```

#### composeInterceptors()

Compose multiple interceptors into a single interceptor:

```typescript
function composeInterceptors(...interceptors: InterceptorLike[]): InterceptorFn
```

#### when()

Create a conditional interceptor:

```typescript
function when(
  predicate: (context: InjectionContext) => boolean,
  interceptor: InterceptorLike
): InterceptorFn
```

### Type Guards

```typescript
function isClassInterceptor(value: InterceptorLike): value is Interceptor
function isFunctionalInterceptor(value: InterceptorLike): value is InterceptorFn
```

### Built-in Interceptors

```typescript
class CachingInterceptor implements Interceptor {
  constructor(ttl?: number)
}

class LoggingInterceptor implements Interceptor {
  constructor(logger?: Logger)
}

class RetryInterceptor implements Interceptor {
  constructor(maxRetries?: number, delay?: number)
}

class ValidationInterceptor implements Interceptor {
  constructor(
    validator: (value: unknown) => boolean,
    errorMessage?: string
  )
}
```

### Logger

Interface for LoggingInterceptor:

```typescript
interface Logger {
  log(message: string, context?: unknown): void;
  error(message: string, error?: unknown): void;
  warn(message: string, context?: unknown): void;
}
```

### InterceptorChain

```typescript
class InterceptorChain {
  add(interceptor: Interceptor): void;
  execute<T>(context: InjectionContext, factory: () => T): T;
  executeAsync<T>(context: InjectionContext, factory: () => Promise<T>): Promise<T>;
}
```

---

## Middleware System

### Middleware

Interface for middleware:

```typescript
interface Middleware {
  priority: number;
  pre?(context: InjectionContext): void | Promise<void>;
  post?<T>(context: InjectionContext, instance: T): T | Promise<T>;
}
```

### MiddlewareRunner

Runner for executing middleware chain:

```typescript
class MiddlewareRunner {
  add(middleware: Middleware): void;
  runPre(context: InjectionContext): Promise<void>;
  runPost<T>(context: InjectionContext, instance: T): Promise<T>;
}
```

---

## Plugin System

### ContainerPlugin

```typescript
interface ContainerPlugin {
  name: string;
  version?: string;
  install(container: unknown): void | Promise<void>;
  uninstall?(container: unknown): void | Promise<void>;
}
```

### PluginManager

```typescript
class PluginManager {
  install(plugin: ContainerPlugin, container: unknown): Promise<void>;
  uninstall(pluginName: string, container: unknown): Promise<void>;
  getPlugin(name: string): ContainerPlugin | undefined;
  listPlugins(): ContainerPlugin[];
  hasPlugin(name: string): boolean;
}
```

See [Plugin System](/guide/plugins) for complete documentation and examples.

---

## Testing

### TestContainer

```typescript
class TestContainer extends Container {
  override<T>(token: Token<T>, value: T | Provider<T>): void;
  mock<T>(token: Token<T>, partial: Partial<T>): T;
  spy<T>(token: Token<T>): T;
  reset(): void;
  snapshot(): { providers: Map<Token, Provider>; restore(): void };
}
```

### Helper Functions

```typescript
function createTestContainer(...providers: Provider[]): TestContainer;
function createMockProvider<T>(token: Token<T>, mock: Partial<T>): Provider<T>;
function createSpyProvider<T>(token: Token<T>, impl: T): Provider<T>;
```

---

## Lifecycle Interfaces

```typescript
interface OnInit {
  onInit(): void | Promise<void>;
}

interface OnDestroy {
  onDestroy(): void | Promise<void>;
}

interface OnInject {
  onInject(context: InjectionContext): void | Promise<void>;
}

interface OnRequest {
  onRequest(requestId: string | symbol): void | Promise<void>;
}

interface Disposable {
  dispose(): void | Promise<void>;
}
```

### ScopeManager

Manager for custom scopes:

```typescript
class ScopeManager {
  createScope(name: string): void;
  deleteScope(name: string): void;
  setInScope(name: string, token: Token, value: unknown): void;
  getFromScope(name: string, token: Token): unknown;
  hasScope(name: string): boolean;
  clearScope(name: string): Promise<void>;
  listScopes(): string[];
}
```

---

## Bootstrap

```typescript
async function bootstrap<T extends object>(
  RootModule: Constructor<T>,
  options?: BootstrapOptions
): Promise<{ app: T; container: Container }>

function createApplication<T extends object>(
  RootModule: Constructor<T>,
  options?: BootstrapOptions
): Container

interface BootstrapOptions {
  providers?: Provider[];
  strict?: boolean;
  validate?: boolean;
  debug?: boolean;
}
```

---

## Module Functions

```typescript
function createDynamicModule(config: DynamicModuleConfig): Constructor;

interface DynamicModuleConfig {
  module: Constructor;
  imports?: Constructor[];
  providers?: Provider[];
  exports?: (Token | Constructor)[];
}

function createConfigurableModule<T>(
  factory: (options: T) => ModuleConfig
): {
  forRoot(options: T): Constructor;
  forChild(options: Partial<T>): Constructor;
}
```

---

## Forward References

```typescript
function forwardRef<T>(fn: () => Token<T>): ForwardRef<T>;
function resolveForwardRef<T>(token: Token<T> | ForwardRef<T>): Token<T>;
function isForwardRef<T>(token: unknown): token is ForwardRef<T>;

interface ForwardRef<T = unknown> {
  forwardRef: () => Token<T>;
  __forward_ref__: true;
}
```

---

## Provider Helpers

```typescript
function createProvider<T>(
  token: Token<T>,
  implementation: Constructor<T>,
  options?: Partial<ClassProvider<T>>
): ClassProvider<T>;

function createAsyncProvider<T>(
  token: Token<T>,
  factory: () => Promise<T>,
  options?: Partial<AsyncProvider<T>>
): AsyncProvider<T>;

function provideIf<T>(
  condition: boolean,
  provider: Provider<T>
): Provider<T> | null;

function provideForEnvironment<T>(
  environment: string,
  provider: Provider<T>
): Provider<T> | null;
```

---

## Context Types

### InjectionContext

```typescript
interface InjectionContext<TMetadata extends object = Record<string, unknown>> {
  container: ContainerLike;
  token?: Token;
  requestId?: string | symbol;
  metadata: TypedMetadataMap<TMetadata>;
  depth: number;
  path: Token[];
  strategy: ResolutionStrategy;
}
```

### TypedMetadataMap

Typed Map that provides autocomplete for known metadata keys:

```typescript
interface TypedMetadataMap<TMetadata extends object = Record<string, unknown>> {
  get<K extends keyof TMetadata>(key: K): TMetadata[K];
  get(key: string): unknown;
  set<K extends keyof TMetadata>(key: K, value: TMetadata[K]): this;
  set(key: string, value: unknown): this;
  has(key: keyof TMetadata | string): boolean;
  delete(key: keyof TMetadata | string): boolean;
  clear(): void;
  forEach(callbackfn: (value: unknown, key: string) => void): void;
  readonly size: number;
  entries(): IterableIterator<[string, unknown]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<unknown>;
}
```

### Token

```typescript
type Token<T = unknown> =
  | Constructor<T & object>
  | Abstract<T & object>
  | InjectionToken<T>
  | string
  | symbol;
```

---

## Errors

```typescript
class InjectionError extends Error {
  constructor(message: string, token?: Token);
}

class NoProviderError extends InjectionError {
  constructor(token: Token);
}

class CircularDependencyError extends InjectionError {
  constructor(path: Token[]);
}

class ScopeError extends InjectionError {
  constructor(message: string, token?: Token);
}

class ValidationError extends InjectionError {
  constructor(message: string, token: Token, value: unknown);
}
```

---

## EnhancedCache

```typescript
class EnhancedCache<K, V> {
  constructor(options?: CacheOptions<K>);

  set(
    key: K,
    value: V,
    options?: CacheSetOptions
  ): void;

  get(key: K): V | undefined;
  has(key: K): boolean;
  delete(key: K): Promise<void>;
  clear(): Promise<void>;

  get size(): number;
  getStatistics(): CacheStatistics;
}

interface CacheOptions<K> {
  maxSize?: number;              // Maximum entries (default: 1000)
  evictionPolicy?: CacheEvictionPolicy;  // 'lru' | 'lfu' | 'fifo' (default: 'lru')
  onDisposeError?: (error: unknown, key: K) => void;  // Error handler for dispose callbacks
}

interface CacheSetOptions {
  ttl?: number;                  // Time to live in milliseconds
  dispose?: () => void | Promise<void>;  // Cleanup callback on eviction
}

interface CacheStatistics {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
}

type CacheEvictionPolicy = 'lru' | 'lfu' | 'fifo';
```

---

## Type Guards

```typescript
function hasOnInit(obj: unknown): obj is OnInit;
function hasOnDestroy(obj: unknown): obj is OnDestroy;
function hasOnInject(obj: unknown): obj is OnInject;
function hasOnRequest(obj: unknown): obj is OnRequest;
function isConstructor(value: unknown): value is Constructor;
function isProvider(value: unknown): value is Provider;
function isDefined<T>(value: T | null | undefined): value is T;
```
