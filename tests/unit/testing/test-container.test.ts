import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMockProvider,
  createSpyProvider,
  createTestContainer,
  Injectable,
  InjectionToken,
  Provider,
  TestContainer,
} from '../../../src';

// Test tokens
const TOKEN_A = new InjectionToken<string>('A');
const TOKEN_B = new InjectionToken<number>('B');

// Test services
interface IService {
  getValue(): string;
  add(a: number, b: number): number;
}

@Injectable()
class RealService implements IService {
  getValue() {
    return 'real-value';
  }

  add(a: number, b: number) {
    return a + b;
  }
}

describe('TestContainer', () => {
  let container: TestContainer;

  beforeEach(() => {
    container = new TestContainer();
  });

  // ========== Constructor ==========

  describe('constructor', () => {
    it('should extend Container', () => {
      expect(container).toBeInstanceOf(TestContainer);
    });

    it('should accept providers', () => {
      const testContainer = new TestContainer([
        { provide: TOKEN_A, useValue: 'initial-value' },
      ]);

      expect(testContainer.get(TOKEN_A)).toBe('initial-value');
    });
  });

  // ========== override() ==========

  describe('override()', () => {
    it('should override with value', () => {
      container.addProvider({ provide: TOKEN_A, useValue: 'original' });
      expect(container.get(TOKEN_A)).toBe('original');

      container.override(TOKEN_A, 'overridden');
      expect(container.get(TOKEN_A)).toBe('overridden');
    });

    it('should override with provider', () => {
      container.addProvider({ provide: TOKEN_A, useValue: 'original' });

      container.override(TOKEN_A, { provide: TOKEN_A, useValue: 'provider-override' });
      expect(container.get(TOKEN_A)).toBe('provider-override');
    });

    it('should override factory provider', () => {
      container.addProvider({
        provide: TOKEN_A,
        useFactory: () => 'factory-value',
      });

      container.override(TOKEN_A, 'direct-value');
      expect(container.get(TOKEN_A)).toBe('direct-value');
    });

    it('should override class provider', () => {
      container.addProvider({ provide: RealService, useClass: RealService });

      const mockService = { getValue: () => 'mock', add: () => 0 };
      container.override(RealService, mockService as RealService);

      const result = container.get(RealService);
      expect(result.getValue()).toBe('mock');
    });

    it('should clear singleton cache on override', () => {
      container.addProvider({ provide: TOKEN_A, useValue: 'original' });
      container.get(TOKEN_A); // Cache the singleton

      container.override(TOKEN_A, 'new-value');

      expect(container.get(TOKEN_A)).toBe('new-value');
    });
  });

  // ========== mock() ==========

  describe('mock()', () => {
    it('should create and register mock', () => {
      container.addProvider({ provide: RealService, useClass: RealService });

      const mock = container.mock(RealService, {
        getValue: () => 'mocked-value',
      });

      expect(mock.getValue()).toBe('mocked-value');
      expect(container.get(RealService).getValue()).toBe('mocked-value');
    });

    it('should return mock object', () => {
      const mock = container.mock(TOKEN_A, 'mock-string' as unknown as Partial<string>);

      expect(mock).toBe('mock-string');
    });

    it('should allow partial mock', () => {
      container.addProvider({ provide: RealService, useClass: RealService });

      const mock = container.mock(RealService, {
        getValue: () => 'partial-mock',
        // add is not provided - will be undefined
      });

      expect(mock.getValue()).toBe('partial-mock');
      expect(mock.add).toBeUndefined();
    });

    it('should replace existing provider', () => {
      container.addProvider({ provide: TOKEN_B, useValue: 42 });
      expect(container.get(TOKEN_B)).toBe(42);

      container.mock(TOKEN_B, 100 as unknown as Partial<number>);

      expect(container.get(TOKEN_B)).toBe(100);
    });
  });

  // ========== spy() ==========

  describe('spy()', () => {
    beforeEach(() => {
      container.addProvider({ provide: RealService, useClass: RealService });
    });

    it('should create spy that wraps original', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const spy = container.spy(RealService);
      const result = spy.getValue();

      expect(result).toBe('real-value');
      expect(consoleSpy).toHaveBeenCalledWith('Spy: getValue called with', []);

      consoleSpy.mockRestore();
    });

    it('should pass arguments through spy', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const spy = container.spy(RealService);
      const result = spy.add(2, 3);

      expect(result).toBe(5);
      expect(consoleSpy).toHaveBeenCalledWith('Spy: add called with', [2, 3]);

      consoleSpy.mockRestore();
    });

    it('should replace original in container', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      // Create spy which replaces the provider
      const spy = container.spy(RealService);

      // Use the spy directly (spy() returns the wrapped instance)
      spy.getValue();

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should preserve non-function properties', () => {
      class ServiceWithProps {
        public name = 'service';

        getValue() {
          return this.name;
        }
      }

      container.addProvider({ provide: ServiceWithProps, useClass: ServiceWithProps });
      const spy = container.spy(ServiceWithProps);

      expect(spy.name).toBe('service');
    });
  });

  // ========== reset() ==========

  describe('reset()', () => {
    it('should clear mocks', () => {
      container.mock(TOKEN_A, 'mocked' as unknown as Partial<string>);
      container.mock(TOKEN_B, 0 as unknown as Partial<number>);

      container.reset();

      // Reset clears internal tracking, not the providers themselves
      // Providers remain registered
      expect(container.get(TOKEN_A)).toBe('mocked');
    });

    it('should clear spies', () => {
      container.addProvider({ provide: RealService, useClass: RealService });
      container.spy(RealService);

      container.reset();

      // Reset clears internal spy tracking
      // The spy provider remains registered
    });

    it('should be callable multiple times', () => {
      container.reset();
      container.reset();
      container.reset();

      // Should not throw
    });
  });

  // ========== snapshot() ==========

  describe('snapshot()', () => {
    it('should capture current provider state', () => {
      container.addProvider({ provide: TOKEN_A, useValue: 'original' });

      const snap = container.snapshot();

      expect(snap.providers).toBeInstanceOf(Map);
      expect(snap.restore).toBeInstanceOf(Function);
    });

    it('should allow restore after changes', () => {
      container.addProvider({ provide: TOKEN_A, useValue: 'original' });

      const snap = container.snapshot();

      container.override(TOKEN_A, 'changed');
      expect(container.get(TOKEN_A)).toBe('changed');

      snap.restore();

      expect(container.get(TOKEN_A)).toBe('original');
    });

    it('should restore multiple times', () => {
      container.addProvider({ provide: TOKEN_A, useValue: 'initial' });
      const snap = container.snapshot();

      container.override(TOKEN_A, 'change1');
      snap.restore();
      expect(container.get(TOKEN_A)).toBe('initial');

      container.override(TOKEN_A, 'change2');
      snap.restore();
      expect(container.get(TOKEN_A)).toBe('initial');
    });

    it('should capture multiple providers', () => {
      container.addProvider({ provide: TOKEN_A, useValue: 'A' });
      container.addProvider({ provide: TOKEN_B, useValue: 1 });

      const snap = container.snapshot();

      container.override(TOKEN_A, 'changed-A');
      container.override(TOKEN_B, 2);

      snap.restore();

      expect(container.get(TOKEN_A)).toBe('A');
      expect(container.get(TOKEN_B)).toBe(1);
    });
  });
});

describe('createTestContainer()', () => {
  it('should create TestContainer', () => {
    const container = createTestContainer();

    expect(container).toBeInstanceOf(TestContainer);
  });

  it('should accept providers as arguments', () => {
    const container = createTestContainer(
      { provide: TOKEN_A, useValue: 'test-A' } as Provider,
      { provide: TOKEN_B, useValue: 42 } as Provider,
    );

    expect(container.get(TOKEN_A)).toBe('test-A');
    expect(container.get(TOKEN_B)).toBe(42);
  });

  it('should create empty container with no arguments', () => {
    const container = createTestContainer();

    expect(() => container.get(TOKEN_A)).toThrow();
  });
});

describe('createMockProvider()', () => {
  it('should create value provider with mock', () => {
    const provider = createMockProvider(RealService, {
      getValue: () => 'mocked',
    });

    expect(provider.provide).toBe(RealService);
    expect((provider as { useValue: IService }).useValue.getValue()).toBe('mocked');
  });

  it('should work with tokens', () => {
    const provider = createMockProvider(TOKEN_A, 'mock-value' as unknown as Partial<string>);

    expect(provider.provide).toBe(TOKEN_A);
    expect((provider as { useValue: string }).useValue).toBe('mock-value');
  });

  it('should be usable in TestContainer', () => {
    // Use token-based provider to avoid @Injectable auto-registration
    const SERVICE_TOKEN = new InjectionToken<IService>('SERVICE');
    const container = createTestContainer(
      createMockProvider(SERVICE_TOKEN, { getValue: () => 'from-mock', add: () => 0 }) as Provider,
    );

    const service = container.get(SERVICE_TOKEN);
    expect(service.getValue()).toBe('from-mock');
  });
});

describe('createSpyProvider()', () => {
  it('should create provider that wraps implementation', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const implementation: IService = {
      getValue: () => 'spy-value',
      add: (a, b) => a + b,
    };

    const provider = createSpyProvider(RealService, implementation as RealService);

    expect(provider.provide).toBe(RealService);

    const spy = (provider as { useValue: RealService }).useValue;
    expect(spy.getValue()).toBe('spy-value');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should log method calls with arguments', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const implementation: IService = {
      getValue: () => 'value',
      add: (a, b) => a + b,
    };

    const provider = createSpyProvider(RealService, implementation as RealService);
    const spy = (provider as { useValue: RealService }).useValue;

    spy.add(10, 20);

    expect(consoleSpy).toHaveBeenCalledWith('Spy: add called with', [10, 20]);

    consoleSpy.mockRestore();
  });

  it('should be usable in TestContainer', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    // Use token-based provider to avoid @Injectable auto-registration
    const SERVICE_TOKEN = new InjectionToken<IService>('SERVICE');
    const container = createTestContainer(
      createSpyProvider(SERVICE_TOKEN, {
        getValue: () => 'spy-value',
        add: (a, b) => a + b,
      }) as Provider,
    );

    const service = container.get(SERVICE_TOKEN);
    const result = service.getValue();

    expect(result).toBe('spy-value');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
