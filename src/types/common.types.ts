/**
 * Constructor type for classes used in dependency injection.
 * Uses `any[]` for args since the DI container resolves constructor dependencies at runtime.
 *
 * @template T - The instance type created by the constructor
 * @template TArgs - Constructor parameter types (defaults to any[] for runtime resolution)
 *
 * @example
 * ```ts
 * class UserService {
 *   constructor(private db: Database) {}
 * }
 *
 * const ctor: Constructor<UserService> = UserService;
 * container.register(ctor);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T extends object = object, TArgs extends readonly any[] = any[]> = new (...args: TArgs) => T;

/**
 * Abstract class constructor type for provider registration.
 * Uses `any[]` for args since the DI container resolves constructor dependencies at runtime.
 *
 * @template T - The instance type created by the abstract constructor
 *
 * @example
 * ```ts
 * abstract class Logger {
 *   abstract log(message: string): void;
 * }
 *
 * class ConsoleLogger extends Logger {
 *   log(message: string) { console.log(message); }
 * }
 *
 * container.register({ provide: Logger as Abstract<Logger>, useClass: ConsoleLogger });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Abstract<T extends object = object> = abstract new (...args: any[]) => T;

/**
 * Factory function that creates dependencies dynamically.
 * Can return a Promise for async initialization. Dependencies are injected by the container.
 *
 * @template T - The value type created by the factory
 * @template TDeps - Injected dependency types (defaults to any[] for runtime resolution)
 *
 * @example
 * ```ts
 * const factory: Factory<Database> = (config: Config) => {
 *   return new Database(config.connectionString);
 * };
 *
 * container.register({ provide: 'DB', useFactory: factory, deps: [Config] });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Factory<T, TDeps extends readonly any[] = any[]> = (...deps: TDeps) => T | Promise<T>;

/**
 * Token types used to identify dependencies in the container.
 * Supports class constructors, abstract classes, custom tokens (InjectionToken), strings, and symbols.
 *
 * @template T - The type of value associated with this token
 *
 * @example
 * ```ts
 * // Class as token
 * container.get(UserService);
 *
 * // String as token
 * container.get<string>('API_URL');
 *
 * // Symbol as token
 * const CONFIG = Symbol('config');
 * container.get(CONFIG);
 *
 * // Custom InjectionToken
 * const API_TOKEN = new InjectionToken<ApiService>('api');
 * container.get(API_TOKEN);
 * ```
 */
export type Token<T = unknown> =
  | Constructor<T & object>
  | Abstract<T & object>
  | InjectionTokenLike<T>
  | string
  | symbol;

/**
 * Interface for custom injection tokens that carry type information via generics.
 * Provides type safety for non-class tokens like strings or symbols.
 */
export interface InjectionTokenLike<T = unknown> {
  toString(): string;
  /** Phantom type property for generic type inference - never set at runtime */
  readonly __type?: T;
}

/**
 * Strategy for controlling how dependencies are resolved.
 *
 * - `default`: Immediate resolution
 * - `lazy`: Returns a proxy that resolves on first property access
 * - `proxy`: Always wraps the instance in a proxy
 * - `optional`: Returns `null` if provider is missing instead of throwing
 * - `async`: Returns a Promise for async provider initialization
 */
export type ResolutionStrategy = 'default' | 'lazy' | 'proxy' | 'optional' | 'async';
