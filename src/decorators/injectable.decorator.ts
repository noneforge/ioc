import 'reflect-metadata';

import { METADATA } from '../constants';
import { GlobalProviderRegistry } from '../core';
import type { ClassProvider, Constructor, Provider, ProviderScope } from '../types';

/**
 * Marks a class as injectable for dependency injection.
 *
 * When `providedIn: 'root'` (default), the class is automatically registered
 * in the global registry and available everywhere without explicit registration.
 * Use `providedIn: null` to require manual registration in modules.
 *
 * @param options - Configuration for the injectable class
 * @param options.providedIn - Where to register the provider (default: 'root').
 * Set to `null` to disable auto-registration
 * @param options.scope - Lifecycle scope: 'singleton' (default), 'transient', or 'request'
 * @param options.tags - Optional tags for provider filtering and organization
 *
 * @example
 * ```ts
 * // Auto-registered singleton service
 * ＠Injectable()
 * class UserService {}
 *
 * // Transient instance per resolution
 * ＠Injectable({ scope: 'transient' })
 * class RequestLogger {}
 *
 * // Manual registration required
 * ＠Injectable({ providedIn: null })
 * class FeatureService {}
 * ```
 */
export function Injectable(options?: {
  providedIn?: 'root' | 'platform' | 'any' | null;
  scope?: ProviderScope;
  tags?: string[];
}): ClassDecorator {
  return (<T extends Function>(target: T) => {
    Reflect.defineMetadata(METADATA.INJECTABLE, true, target);

    const providedIn = options?.providedIn === undefined ? 'root' : options.providedIn;
    const scope = options?.scope ?? 'singleton';

    Reflect.defineMetadata(METADATA.PROVIDED_IN, providedIn, target);
    Reflect.defineMetadata(METADATA.SCOPE, scope, target);

    if (providedIn === 'root') {
      const provider: ClassProvider = {
        provide: target as unknown as Constructor,
        useClass: target as unknown as Constructor,
        scope,
        tags: options?.tags,
      };
      GlobalProviderRegistry.register(provider as unknown as Provider);
    }

    return target;
  });
}
