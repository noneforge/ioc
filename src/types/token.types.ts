import type { Factory } from './common.types';
import type { ProviderScope } from './scope.types';

/**
 * Configuration options for creating injection tokens.
 *
 * @example
 * ```ts
 * const API_URL = new InjectionToken<string>('API_URL', {
 *   providedIn: 'root',
 *   factory: () => process.env.API_URL || 'https://api.example.com'
 * });
 *
 * const PORT = new InjectionToken<number>('PORT', {
 *   factory: () => 3000,
 *   validator: (value) => typeof value === 'number' && value > 0,
 *   transformer: (value) => Math.floor(value)
 * });
 * ```
 */
interface InjectionTokenOptions<T> {
  /**
   * Automatic registration scope. Use 'root' for app-wide singletons,
   * 'platform' for platform-level services, or 'any' for per-injector instances
   * @default null
   */
  providedIn?: 'root' | 'platform' | 'any' | null;
  /**
   * Factory function invoked when no explicit provider exists
   * @default undefined
   */
  factory?: Factory<T>;
  /**
   * Enables multiple providers to register under this token,
   * resolving to an array of all registered values
   * @default false
   */
  multi?: boolean;
  /**
   * Default lifecycle scope for providers using this token
   * @default 'singleton'
   */
  scope?: ProviderScope;
  /**
   * Validates resolved values before injection. Throws if validation fails
   * @default undefined
   */
  validator?: (value: unknown) => boolean;
  /**
   * Transforms resolved values before injection. Applied after validation
   * @default undefined
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformer?: (value: any) => T;
}

/**
 * Type-safe token for dependency injection without class references.
 *
 * Use injection tokens to register dependencies that aren't classes
 * (primitives, interfaces, external types) or to provide multiple
 * implementations of the same type.
 *
 * @template T - The type of value this token represents
 *
 * @example
 * ```ts
 * // Simple token for configuration
 * const API_URL = new InjectionToken<string>('API_URL');
 * container.registerValue(API_URL, 'https://api.example.com');
 * const url = container.get(API_URL);
 *
 * // Token with automatic factory
 * const CONFIG = new InjectionToken<AppConfig>('CONFIG', {
 *   providedIn: 'root',
 *   factory: () => loadConfig()
 * });
 *
 * // Multi-provider token for plugins
 * const PLUGIN = new InjectionToken<Plugin>('PLUGIN', { multi: true });
 * container.register(PLUGIN, { useClass: LogPlugin });
 * container.register(PLUGIN, { useClass: MetricsPlugin });
 * const plugins = container.get(PLUGIN); // [LogPlugin, MetricsPlugin]
 * ```
 */
export class InjectionToken<T = unknown> {
  declare readonly __type?: T;

  private readonly _desc: string;
  private readonly _options?: InjectionTokenOptions<T>;

  constructor(
    description: string,
    options?: InjectionTokenOptions<T>,
  ) {
    this._desc = description;
    this._options = options;
  }

  toString(): string {
    return `InjectionToken(${this._desc})`;
  }

  get options(): InjectionTokenOptions<T> | undefined {
    return this._options;
  }

  /**
   * Validates a value using the configured validator.
   * Returns true if no validator is configured
   */
  validate(value: unknown): boolean {
    return this._options?.validator?.(value) ?? true;
  }

  /**
   * Transforms a value using the configured transformer.
   * Returns the value unchanged if no transformer is configured
   */
  transform(value: unknown): T {
    return this._options?.transformer?.(value) ?? (value as T);
  }
}
