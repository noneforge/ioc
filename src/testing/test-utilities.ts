import type { Provider, Token, ValueProvider } from '../types';
import { TestContainer } from './test-container';

/**
 * Creates a test container with the specified providers
 *
 * @param providers - Providers to register in the test container
 *
 * @example
 * ```ts
 * const container = createTestContainer(
 *   { provide: 'API_URL', useValue: 'https://test.api' },
 *   UserService
 * );
 * ```
 */
export function createTestContainer(...providers: Provider[]): TestContainer {
  return new TestContainer(providers);
}

/**
 * Creates a mock provider from a partial implementation
 *
 * Useful for testing when you only need to mock specific methods or properties
 * of a dependency.
 *
 * @param token - The injection token to provide
 * @param mockImplementation - Partial implementation with only the methods/properties needed for testing
 *
 * @example
 * ```ts
 * const mockLogger = createMockProvider(Logger, {
 *   log: () => console.log('mocked'),
 *   error: () => console.error('mocked')
 * });
 * ```
 */
export function createMockProvider<T>(token: Token<T>, mockImplementation: Partial<T>): ValueProvider<T> {
  return {
    provide: token,
    useValue: mockImplementation as T,
  };
}

/**
 * Creates a spy provider that logs all method calls to the console
 *
 * Wraps the implementation in a Proxy that intercepts method calls and logs
 * them with `console.info` before executing. Useful for debugging test interactions.
 *
 * @param token - The injection token to provide
 * @param implementation - The actual implementation to wrap with spy behavior
 *
 * @example
 * ```ts
 * const userService = new UserService();
 * const spy = createSpyProvider(UserService, userService);
 *
 * container.register(spy);
 * const instance = container.get(UserService);
 * instance.getUser(123); // Logs: "Spy: getUser called with [123]"
 * ```
 */
export function createSpyProvider<T extends object>(token: Token<T>, implementation: T): ValueProvider<T> {
  const spy = new Proxy(implementation as object, {
    get(target, prop) {
      const value = Reflect.get(target, prop) as unknown;
      if (typeof value === 'function') {
        return function(this: unknown, ...args: unknown[]) {
          console.info(`Spy: ${String(prop)} called with`, args);

          const fn = value as (...a: unknown[]) => unknown;

          return fn.apply(this, args);
        };
      }

      return value;
    },
  }) as T;

  return {
    provide: token,
    useValue: spy,
  };
}
