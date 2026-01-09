import 'reflect-metadata';

import { METADATA } from '../constants';
import type { Constructor, Provider, Token } from '../types';

/**
 * Configuration metadata for organizing providers and dependencies.
 * Modules are loaded in order: imports → providers → exports.
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [DatabaseModule],        // Load dependencies first
 *   providers: [UserService],          // Register providers
 *   exports: [UserService],            // Make available to importers
 * })
 * class UserModule {}
 * ```
 */
export interface ModuleMetadata {
  /** Other modules to import. Loaded first in dependency order */
  imports?: Constructor[];
  /** Providers to register in this module. Defaults to empty array */
  providers?: Provider[];
  /** Providers or tokens to make available to modules that import this one. Defaults to empty array */
  exports?: (Provider | Token)[];
}

/**
 * Marks a class as a module for organizing providers and managing dependencies.
 * Uses reflect-metadata to store module configuration on the class.
 *
 * @param metadata - Module configuration
 * @param metadata.imports - Modules to import, loaded first in dependency order
 * @param metadata.providers - Providers to register after imports are loaded
 * @param metadata.exports - Providers or tokens made available to modules that import this one
 *
 * @example
 * ```ts
 * // Basic module with providers
 * @Module({
 *   providers: [LoggerService],
 *   exports: [LoggerService],
 * })
 * class CoreModule {}
 *
 * // Module with dependencies
 * @Module({
 *   imports: [CoreModule],
 *   providers: [UserService],
 *   exports: [UserService],
 * })
 * class UserModule {}
 * ```
 */
export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (<T extends Function>(target: T): T => {
    Reflect.defineMetadata(METADATA.MODULE, true, target);
    Reflect.defineMetadata(METADATA.MODULE_IMPORTS, metadata.imports ?? [], target);
    Reflect.defineMetadata(METADATA.MODULE_PROVIDERS, metadata.providers ?? [], target);
    Reflect.defineMetadata(METADATA.MODULE_EXPORTS, metadata.exports ?? [], target);

    return target;
  });
}

/**
 * Creates a module programmatically at runtime for dynamic configuration.
 * Preserves the module class name or uses 'DynamicModule' as fallback.
 *
 * @param config - Module configuration
 * @param config.module - Class reference used for module naming
 * @param config.imports - Modules to import (optional)
 * @param config.providers - Providers to register (optional)
 * @param config.exports - Providers or tokens to export (optional)
 * @returns Fully decorated module class ready to load into container
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
 * @see createConfigurableModule for forRoot/forChild pattern
 */
export function createDynamicModule(config: {
  module: Constructor;
  imports?: Constructor[];
  providers?: Provider[];
  exports?: (Provider | Token)[];
}): Constructor {
  @Module({
    imports: config.imports,
    providers: config.providers,
    exports: config.exports,
  })
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class DynamicModuleClass {}

  Object.defineProperty(DynamicModuleClass, 'name', {
    value: config.module.name !== '' ? config.module.name : 'DynamicModule',
  });

  return DynamicModuleClass;
}

/**
 * Creates a configurable module with forRoot/forChild pattern for shared services.
 * forRoot accepts full configuration for root modules, forChild accepts partial
 * configuration for feature modules. Commonly used for database, auth, or config modules.
 *
 * @template TOptions - Configuration object shape
 * @param moduleFactory - Factory function that receives options and returns module configuration
 * @returns Object with forRoot and forChild methods for different configuration contexts
 *
 * @example
 * ```ts
 * // Define configuration interface
 * interface DatabaseConfig {
 *   host: string;
 *   port: number;
 *   database: string;
 * }
 *
 * // Create configurable module
 * const DatabaseModule = createConfigurableModule<DatabaseConfig>((config) => ({
 *   providers: [
 *     { provide: DB_CONFIG, useValue: config },
 *     DatabaseService,
 *   ],
 *   exports: [DatabaseService],
 * }));
 *
 * // Root module with full configuration
 * @Module({
 *   imports: [
 *     DatabaseModule.forRoot({
 *       host: 'localhost',
 *       port: 5432,
 *       database: 'myapp',
 *     }),
 *   ],
 * })
 * class AppModule {}
 *
 * // Feature module with partial override
 * @Module({
 *   imports: [
 *     DatabaseModule.forChild({
 *       database: 'analytics', // Override only specific properties
 *     }),
 *   ],
 * })
 * class AnalyticsModule {}
 * ```
 */
export function createConfigurableModule<TOptions>(
  moduleFactory: (options: TOptions) => {
    imports?: Constructor[];
    providers?: Provider[];
    exports?: (Provider | Token)[];
  },
): {
  forRoot(options: TOptions): Constructor;
  forChild(options: Partial<TOptions>): Constructor;
} {
  return {
    forRoot(options: TOptions): Constructor {
      const config = moduleFactory(options);

      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class RootModule {}

      return createDynamicModule({
        module: RootModule,
        ...config,
      });
    },
    forChild(options: Partial<TOptions>): Constructor {
      const fullOptions = { ...options } as TOptions;
      const config = moduleFactory(fullOptions);

      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class ChildModule {}

      return createDynamicModule({
        module: ChildModule,
        ...config,
      });
    },
  };
}
