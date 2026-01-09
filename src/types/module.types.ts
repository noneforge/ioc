import type { Constructor, Token } from './common.types';
import type { Provider } from './provider.types';

/**
 * Configuration for creating modules programmatically at runtime.
 * Used with `createDynamicModule()` to build modules with runtime-determined
 * configuration (API keys, connection strings, etc.) instead of static decorator metadata.
 *
 * @example
 * ```ts
 * // Create module with runtime configuration
 * function createApiModule(apiKey: string) {
 *   return createDynamicModule({
 *     module: class ApiModule {},
 *     providers: [
 *       { provide: API_KEY, useValue: apiKey },
 *       ApiService,
 *     ],
 *     exports: [ApiService],
 *   });
 * }
 *
 * const ApiModule = createApiModule('sk-12345');
 * container.loadModule(ApiModule);
 * ```
 *
 * @see createDynamicModule
 * @see createConfigurableModule
 */
export interface DynamicModule {
  /** Class reference used for module naming. The class name appears in error messages and debugging output */
  module: Constructor;
  /** Modules to import and load first in dependency order */
  imports?: Constructor[];
  /** Providers to register in this module */
  providers?: Provider[];
  /** Providers or tokens made available to modules that import this one */
  exports?: (Provider | Token)[];
}

/**
 * Extension point for adding custom functionality to the container.
 * Plugins can register global providers, add middleware, integrate monitoring,
 * or implement any cross-cutting concern.
 *
 * @example
 * ```ts
 * const loggingPlugin: ContainerPlugin = {
 *   name: 'logger',
 *   version: '1.0.0',
 *   install(container) {
 *     console.log('Logging plugin installed');
 *     // Register global providers or attach hooks
 *   },
 *   uninstall(container) {
 *     console.log('Logging plugin removed');
 *   },
 * };
 *
 * const manager = new PluginManager();
 * await manager.install(loggingPlugin, container);
 * ```
 *
 * @see PluginManager
 */
export interface ContainerPlugin {
  /** Unique identifier for this plugin. Used to prevent duplicate installations */
  name: string;
  /** Optional semantic version for compatibility tracking */
  version?: string;
  /**
   * Called when the plugin is installed. Receives the container instance
   * to register providers, add interceptors, or configure behavior
   *
   * @param container - The Container instance being extended
   */
  install(container: unknown): void | Promise<void>;
  /**
   * Optional cleanup when the plugin is uninstalled. Should reverse any
   * changes made during installation
   *
   * @param container - The Container instance to clean up
   */
  uninstall?(container: unknown): void | Promise<void>;
}
