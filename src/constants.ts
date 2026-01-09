/**
 * Metadata keys for storing decorator information via `reflect-metadata`.
 * These keys are used by decorators like `@Injectable`, `@Inject`, and `@Module`
 * to attach configuration and dependency information to classes and properties.
 *
 * @example
 * ```ts
 * import { METADATA } from './constants';
 * import 'reflect-metadata';
 *
 * // Decorators use these keys to store metadata
 * Reflect.defineMetadata(METADATA.INJECTABLE, { scope: 'singleton' }, MyService);
 *
 * // The container reads this metadata during resolution
 * const metadata = Reflect.getMetadata(METADATA.INJECTABLE, MyService);
 * ```
 */
export const METADATA = {
  INJECTABLE: 'di:injectable',
  INJECT_TOKENS: 'di:inject-tokens',
  INJECT_PROPERTIES: 'di:inject-properties',
  OPTIONAL_TOKENS: 'di:optional-tokens',
  LAZY_TOKENS: 'di:lazy-tokens',
  SCOPE: 'di:scope',
  PROVIDED_IN: 'di:provided-in',
  LIFECYCLE: 'di:lifecycle',
  MODULE: 'di:module',
  MODULE_PROVIDERS: 'di:module-providers',
  MODULE_IMPORTS: 'di:module-imports',
  MODULE_EXPORTS: 'di:module-exports',
  INTERCEPTORS: 'di:interceptors',
  DECORATORS: 'di:decorators',
  VALIDATIONS: 'di:validations',
  TRANSACTIONAL: 'di:transactional',
  CACHEABLE: 'di:cacheable',
  LOG: 'di:log',
  DISPOSE_METHOD: 'di:dispose-method',
} as const;
