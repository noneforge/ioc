import { METADATA } from '../constants';
import { Container } from '../core';
import { ContainerValidationError } from '../errors';
import type { Constructor, Provider } from '../types';
import { isDefined } from '../utils';

/**
 * Bootstrap options
 */
export interface BootstrapOptions {
  /**
   * Additional providers to register in container
   * @default []
   */
  providers?: Provider[];
  /**
   * Throw error when provider not found
   * @default false
   */
  strict?: boolean;
  /**
   * Validate dependency graph before starting (detect cycles, missing deps)
   * @default false
   */
  validate?: boolean;
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Creates and configures a DI container for the application.
 *
 * Initializes a container with the provided options, loads the root module
 * if it has `@Module` metadata, and enables automatic resource disposal.
 *
 * @template T - The root module type
 * @param RootModule - Constructor of the root module
 * @param options - Container configuration options
 * @returns Configured container instance
 */
export function createApplication<T extends object>(
  RootModule: Constructor<T>,
  options: BootstrapOptions = {},
): Container {
  const container = new Container(options.providers ?? [], undefined, {
    strict: options.strict,
    debug: options.debug,
    autoDispose: true,
  });

  if (isDefined(Reflect.getMetadata(METADATA.MODULE, RootModule))) {
    container.loadModule(RootModule);
  }

  return container;
}

/**
 * Bootstraps the application with dependency injection.
 *
 * Creates a container, optionally validates the dependency graph,
 * resolves the root module instance, and registers graceful shutdown
 * handlers for SIGTERM and SIGINT signals to dispose resources.
 *
 * @template T - The root module type
 * @param RootModule - Constructor of the root module
 * @param options - Bootstrap configuration options
 * @returns Promise resolving to the application instance and container
 * @throws {ContainerValidationError} When validation is enabled and dependency graph is invalid
 */
export async function bootstrap<T extends object>(
  RootModule: Constructor<T>,
  options: BootstrapOptions = {},
): Promise<{ app: T; container: Container }> {
  const container = createApplication(RootModule, options);

  if (options.validate === true) {
    const validation = container.validate();
    if (!validation.valid) {
      throw new ContainerValidationError(
        `Container validation failed:\n${validation.errors.join('\n')}`,
        validation.errors,
      );
    }

    if (validation.warnings.length > 0 && options.debug === true) {
      console.warn('Container warnings:', validation.warnings);
    }
  }

  const app = await container.getAsync(RootModule);

  const shutdown = () => {
    void container.dispose().then(() => {
      process.exit(0);
    });
  };

  if (typeof process !== 'undefined' && 'on' in process) {
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  return { app, container };
}
