import 'reflect-metadata';

import { METADATA } from '../constants';
import type { ForwardRef, Token } from '../types';
import { resolveForwardRef } from '../utils';

/** Internal configuration for property injection metadata */
interface PropertyConfig {
  token?: Token;
  optional?: boolean;
  lazy?: boolean;
}

/**
 * Overrides the injection token for a constructor parameter or property.
 *
 * By default, TypeScript's `emitDecoratorMetadata` provides type info for
 * constructor parameters. Use `@Inject` when you need to inject by a specific
 * token (string, symbol, InjectionToken, or class) instead of relying on the
 * reflected type.
 *
 * Supports forward references via `forwardRef(() => Token)` to handle circular
 * dependencies between modules.
 *
 * @param token - Token to inject (string, symbol, InjectionToken, class, or forwardRef)
 *
 * @example
 * ```ts
 * // Constructor parameter injection
 * class UserService {
 *   constructor(
 *     @Inject('API_URL') private apiUrl: string,
 *     @Inject(LoggerToken) private logger: Logger
 *   ) {}
 * }
 *
 * // Property injection
 * class AppComponent {
 *   @Inject(ConfigToken)
 *   config!: AppConfig;
 * }
 *
 * // Forward reference
 * class ServiceA {
 *   constructor(
 *     @Inject(forwardRef(() => ServiceB)) serviceB: ServiceB
 *   ) {}
 * }
 * ```
 */
export function Inject(token: Token | ForwardRef): ParameterDecorator & PropertyDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const resolved = resolveForwardRef(token);

    if (parameterIndex !== undefined) {
      const existing = (Reflect.getMetadata(METADATA.INJECT_TOKENS, target) as Token[] | undefined) ?? [];

      existing[parameterIndex] = resolved;
      Reflect.defineMetadata(METADATA.INJECT_TOKENS, existing, target);
    } else if (propertyKey !== undefined) {
      const existing =
        (Reflect.getMetadata(METADATA.INJECT_PROPERTIES, target) as Map<string | symbol, PropertyConfig> | undefined)
        ?? new Map<string | symbol, PropertyConfig>();

      existing.set(propertyKey, { token: resolved, optional: false, lazy: false });
      Reflect.defineMetadata(METADATA.INJECT_PROPERTIES, existing, target);
    }
  };
}

/**
 * Marks a dependency as optional, allowing `null` if the provider is not registered.
 *
 * Without this decorator, the container throws `TokenNotFoundError` when a
 * dependency cannot be resolved. With `@Optional`, it injects `null` instead.
 *
 * Can be combined with `@Inject` in any order. When used on properties without
 * `@Inject`, the container attempts to resolve by the property's reflected type.
 *
 * @example
 * ```ts
 * // Constructor parameter
 * class NotificationService {
 *   constructor(
 *     @Inject(EmailService) @Optional() emailService: EmailService | null
 *   ) {
 *     if (emailService) {
 *       // Email notifications available
 *     }
 *   }
 * }
 *
 * // Property injection
 * class AnalyticsService {
 *   @Inject(TrackerToken)
 *   @Optional()
 *   tracker?: Tracker;
 * }
 * ```
 */
export function Optional(): ParameterDecorator & PropertyDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    if (parameterIndex !== undefined) {
      const existing = (Reflect.getMetadata(METADATA.OPTIONAL_TOKENS, target) as boolean[] | undefined) ?? [];

      existing[parameterIndex] = true;
      Reflect.defineMetadata(METADATA.OPTIONAL_TOKENS, existing, target);
    } else if (propertyKey !== undefined) {
      const existing =
        (Reflect.getMetadata(METADATA.INJECT_PROPERTIES, target) as Map<string | symbol, PropertyConfig> | undefined)
        ?? new Map<string | symbol, PropertyConfig>();

      const config = existing.get(propertyKey) ?? {};
      config.optional = true;

      existing.set(propertyKey, config);
      Reflect.defineMetadata(METADATA.INJECT_PROPERTIES, existing, target);
    }
  };
}
