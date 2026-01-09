import { Container } from '../core';
import type { Provider, Token } from '../types';

/**
 * Internal container structure for accessing private maps.
 * Used by TestContainer to manipulate singleton cache and provider registry.
 */
interface ContainerInternals {
  singletons: Map<Token, unknown>;
  providers: Map<Token, Provider[]>;
}

/**
 * Enhanced container for testing with mocking and spying capabilities.
 *
 * Extends Container to allow runtime replacement of providers, enabling
 * isolated unit testing without modifying the actual provider configuration.
 *
 * @example
 * ```ts
 * const container = new TestContainer();
 * container.register(UserService);
 *
 * // Mock a dependency
 * container.mock(ApiClient, {
 *   fetchUser: async () => ({ id: 1, name: 'Test' })
 * });
 *
 * // Spy on a service
 * const spy = container.spy(UserService);
 * await spy.getUser(1); // Logs method calls to console
 * ```
 */
export class TestContainer extends Container {
  private readonly mocks = new Map<Token, unknown>();
  private readonly spies = new Map<Token, unknown>();

  /**
   * Replaces a provider registration with a new value or provider.
   * Clears any cached singleton instance and updates the provider registry.
   *
   * @param token - Injection token to override
   * @param value - Replacement value or provider configuration
   */
  override<T>(token: Token<T>, value: T | Provider<T>): void {
    if (typeof value === 'object' && value !== null && 'provide' in value) {
      this.replaceProvider(token, value as Provider<T>);
    } else {
      this.replaceProvider(token, { provide: token, useValue: value } as Provider<T>);
    }
  }

  /**
   * Creates a partial mock for testing, replacing the provider with mock values.
   * Useful for testing when you only need to stub specific methods or properties.
   *
   * @param token - Service token to mock
   * @param mockValue - Partial implementation with only the methods/properties you need
   * @returns The mock object, typed as T (though only partial properties are implemented)
   *
   * @example
   * ```ts
   * const mock = container.mock(DatabaseService, {
   *   query: async () => [{ id: 1 }]
   * });
   * // Only 'query' is implemented, other methods will be undefined
   * ```
   */
  mock<T>(token: Token<T>, mockValue: Partial<T>): T {
    const mock = mockValue as T;

    this.mocks.set(token, mock);
    this.replaceProvider(token, { provide: token, useValue: mock } as Provider<T>);

    return mock;
  }

  /**
   * Creates a proxy spy that logs all method calls while preserving original behavior.
   * Resolves the real instance first, then wraps it in a proxy for observation.
   *
   * @param token - Service token to spy on
   * @returns Proxy wrapper that logs method invocations to console.info
   *
   * @example
   * ```ts
   * const spy = container.spy(EmailService);
   * await spy.send('test@example.com', 'Hello');
   * // Console: "Spy: send called with ['test@example.com', 'Hello']"
   * ```
   */
  spy<T extends object>(token: Token<T>): T {
    const instance = this.get(token);

    const spy = new Proxy(instance as object, {
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

    this.spies.set(token, spy);

    const provider = { provide: token, useValue: spy } as Provider<T>;
    this.replaceProvider(token, provider);

    return spy;
  }

  /**
   * Replaces a provider and clears its singleton cache.
   * Directly manipulates internal container state for testing purposes.
   */
  private replaceProvider<T>(token: Token<T>, provider: Provider<T>): void {
    const internals = this as unknown as ContainerInternals;

    internals.singletons.delete(token);
    internals.providers.set(token, [provider as Provider]);
  }

  /**
   * Clears all mocks and spies, but does not restore original providers.
   * To restore providers, create a new TestContainer instance.
   */
  reset(): void {
    this.mocks.clear();
    this.spies.clear();
  }

  /**
   * Creates a snapshot of the current provider registry that can be restored later.
   * Useful for temporarily modifying providers and reverting changes in test teardown.
   *
   * @returns Object containing the snapshot and a restore function
   *
   * @example
   * ```ts
   * const snap = container.snapshot();
   * container.mock(UserService, { getUser: () => null });
   * // ... run tests ...
   * snap.restore(); // Reverts to original providers
   * ```
   */
  snapshot(): {
    providers: Map<Token, Provider[]>;
    restore: () => void;
  } {
    const snapshot = new Map((this as unknown as ContainerInternals).providers);

    return {
      providers: snapshot,
      restore: () => {
        (this as unknown as ContainerInternals).providers = new Map(snapshot);
      },
    };
  }
}
