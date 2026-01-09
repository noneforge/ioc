/**
 * Controls the lifecycle and caching behavior of dependency instances.
 *
 * @example
 * ```ts
 * // Singleton - shared configuration service
 * @Injectable({ scope: 'singleton' })
 * class ConfigService {}
 *
 * // Transient - unique instance per consumer
 * @Injectable({ scope: 'transient' })
 * class RequestIdGenerator {}
 *
 * // Request - isolated per HTTP request
 * @Injectable({ scope: 'request' })
 * class RequestContext {}
 * const service = container.get(Service, { requestId: Symbol('req-1') });
 *
 * // Prototype - new instance but shared prototype chain
 * @Injectable({ scope: 'prototype' })
 * class GameEntity {}
 *
 * // Scoped - custom lifecycle via ScopeManager
 * @Injectable({ scope: 'scoped' })
 * class TenantService {}
 * const service = container.get(TenantService, { scopeId: 'tenant-1' });
 * ```
 *
 * @see {@link https://github.com/noneforge/ioc/blob/main/docs/guide/scopes.md | Scopes Guide}
 */
export type ProviderScope =
  | 'singleton'    // Default. Cached per container - use for shared services, configs, loggers
  | 'transient'    // No caching - use for stateless utilities or when each consumer needs unique instance
  | 'request'      // Cached per requestId - use for HTTP request context, transactions, session data
  | 'prototype'    // Similar to transient but shares prototype chain - use for object factories
  | 'scoped';      // Cached per custom scopeId via ScopeManager - use for multi-tenant or feature-specific contexts
