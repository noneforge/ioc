import 'reflect-metadata';

import { METADATA } from '../constants';

interface PropertyConfig {
  token?: unknown;
  optional?: boolean;
  lazy?: boolean;
}

/**
 * Defers dependency resolution until first access via a proxy.
 *
 * Instead of resolving the dependency immediately during construction, `@Lazy()`
 * injects a proxy that resolves the actual instance on first property access or
 * method call. This breaks circular dependencies and improves startup performance.
 *
 * Works on both constructor parameters and properties. For properties, combine
 * with `@Inject()` to specify the token.
 *
 * @example
 * ```ts
 * ＠Injectable()
 * class ServiceA {
 *   constructor(＠Lazy() private serviceB: ServiceB) {
 *     // serviceB is a proxy, not yet resolved
 *   }
 *
 *   doWork() {
 *     this.serviceB.method(); // Resolved here on first access
 *   }
 * }
 *
 * ＠Injectable()
 * class ServiceB {
 *   ＠Inject('config')
 *   ＠Lazy()
 *   config!: AppConfig; // Resolved when config is first accessed
 * }
 * ```
 */
export function Lazy(): ParameterDecorator & PropertyDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    if (parameterIndex !== undefined) {
      const existing = (Reflect.getMetadata(METADATA.LAZY_TOKENS, target) as boolean[] | undefined) ?? [];

      existing[parameterIndex] = true;
      Reflect.defineMetadata(METADATA.LAZY_TOKENS, existing, target);
    } else if (propertyKey !== undefined) {
      const existing =
        (Reflect.getMetadata(METADATA.INJECT_PROPERTIES, target) as Map<string | symbol, PropertyConfig> | undefined)
        ?? new Map<string | symbol, PropertyConfig>();

      const config = existing.get(propertyKey) ?? {};
      config.lazy = true;

      existing.set(propertyKey, config);
      Reflect.defineMetadata(METADATA.INJECT_PROPERTIES, existing, target);
    }
  };
}
