# Testing

@noneforge/ioc provides comprehensive testing utilities including `TestContainer`, mock helpers, and snapshot functionality.

## TestContainer

`TestContainer` extends `Container` with additional testing capabilities:

```typescript
import { TestContainer, Injectable, inject, InjectionToken } from '@noneforge/ioc';

const container = new TestContainer();
```

### Creating TestContainer

```typescript
// Empty container
const container = new TestContainer();

// With initial providers
const container = new TestContainer([
  { provide: API_URL, useValue: 'https://test.api.com' },
  UserService,
]);
```

### Using createTestContainer

Factory function for creating test containers:

```typescript
import { createTestContainer, createMockProvider } from '@noneforge/ioc';

const container = createTestContainer(
  { provide: API_URL, useValue: 'https://test.api.com' },
  UserService,
  createMockProvider(LoggerService, { log: vi.fn() }),
);
```

## Overriding Providers

### override()

Replace a provider with a different implementation:

```typescript
const container = new TestContainer([
  { provide: API_URL, useValue: 'https://production.api.com' },
]);

// Override with test value
container.override(API_URL, 'https://test.api.com');

expect(container.get(API_URL)).toBe('https://test.api.com');
```

Override with a provider object:

```typescript
container.override(UserService, {
  provide: UserService,
  useValue: { getUser: () => ({ id: 1, name: 'Test' }) },
});
```

## Mocking Dependencies

### mock()

Create and register a mock object:

```typescript
@Injectable()
class UserRepository {
  findById(id: number) { /* real implementation */ }
  save(user: User) { /* real implementation */ }
}

const container = new TestContainer([UserRepository]);

// Create mock with partial implementation
const mockRepo = container.mock(UserRepository, {
  findById: (id: number) => ({ id, name: 'Mock User' }),
  // save is not mocked - will be undefined
});

// Use the mock
const repo = container.get(UserRepository);
expect(repo.findById(1)).toEqual({ id: 1, name: 'Mock User' });
expect(repo.save).toBeUndefined();
```

### createMockProvider()

Create a mock provider for use in container initialization:

```typescript
import { createMockProvider, createTestContainer } from '@noneforge/ioc';

const container = createTestContainer(
  createMockProvider(UserRepository, {
    findById: vi.fn().mockReturnValue({ id: 1, name: 'Mock' }),
    save: vi.fn(),
  }),
  UserService, // Uses mocked UserRepository
);

const userService = container.get(UserService);
userService.getUser(1);

expect(container.get(UserRepository).findById).toHaveBeenCalledWith(1);
```

## Spying on Services

### spy()

Create a spy that wraps the original implementation:

```typescript
@Injectable()
class CalculatorService {
  add(a: number, b: number) {
    return a + b;
  }

  multiply(a: number, b: number) {
    return a * b;
  }
}

const container = new TestContainer([CalculatorService]);

// Create spy - wraps original implementation
const spy = container.spy(CalculatorService);

// Original implementation still works
expect(spy.add(2, 3)).toBe(5);

// But calls are logged
// Console: "Spy: add called with [2, 3]"
```

### createSpyProvider()

Create a spy provider for container initialization:

```typescript
import { createSpyProvider, createTestContainer } from '@noneforge/ioc';

const container = createTestContainer(
  createSpyProvider(CalculatorService, {
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
  }),
);

const calc = container.get(CalculatorService);
calc.add(2, 3);
// Logged: "Spy: add called with [2, 3]"
```

## Snapshot and Restore

### snapshot()

Capture the current state of providers:

```typescript
const container = new TestContainer([
  { provide: API_URL, useValue: 'https://original.api.com' },
]);

// Take snapshot
const snap = container.snapshot();

// Modify container
container.override(API_URL, 'https://modified.api.com');
expect(container.get(API_URL)).toBe('https://modified.api.com');

// Restore to snapshot
snap.restore();
expect(container.get(API_URL)).toBe('https://original.api.com');
```

### Use in Tests

```typescript
describe('UserService', () => {
  let container: TestContainer;
  let snapshot: ReturnType<TestContainer['snapshot']>;

  beforeEach(() => {
    container = new TestContainer([
      { provide: API_URL, useValue: 'https://test.api.com' },
      UserRepository,
      UserService,
    ]);
    snapshot = container.snapshot();
  });

  afterEach(() => {
    snapshot.restore(); // Reset to original state
  });

  it('should work with mocked repo', () => {
    container.mock(UserRepository, {
      findById: () => ({ id: 1, name: 'Mocked' }),
    });

    const service = container.get(UserService);
    // Test with mock...
  });

  it('should work with different mock', () => {
    // Fresh container state from snapshot.restore()
    container.mock(UserRepository, {
      findById: () => null,
    });

    const service = container.get(UserService);
    // Test with different mock...
  });
});
```

## reset()

Clear internal mock and spy tracking:

```typescript
container.mock(TOKEN_A, 'mocked');
container.spy(ServiceA);

container.reset(); // Clears tracking, providers remain
```

## Testing Patterns

### Unit Testing with Mocks

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestContainer, createMockProvider, InjectionToken } from '@noneforge/ioc';

// Dependencies
interface Logger {
  log(message: string): void;
  error(message: string): void;
}

const LOGGER = new InjectionToken<Logger>('LOGGER');

@Injectable()
class UserService {
  private logger = inject(LOGGER);

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
    
    return { id: 1, name };
  }
}

describe('UserService', () => {
  let container: TestContainer;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
    };

    container = createTestContainer(
      createMockProvider(LOGGER, mockLogger),
      UserService,
    );
  });

  it('should log when creating user', () => {
    const service = container.get(UserService);

    service.createUser('John');

    expect(mockLogger.log).toHaveBeenCalledWith('Creating user: John');
  });

  it('should return created user', () => {
    const service = container.get(UserService);

    const user = service.createUser('Jane');

    expect(user).toEqual({ id: 1, name: 'Jane' });
  });
});
```

### Integration Testing

```typescript
describe('UserModule Integration', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.loadModule(UserModule);

    // Override only external dependencies
    container.addProvider({
      provide: DATABASE,
      useValue: createTestDatabase(),
    });
  });

  afterEach(async () => {
    await container.dispose();
  });

  it('should create and retrieve user', async () => {
    const userService = container.get(UserService);

    const created = await userService.create({ name: 'Test' });
    const retrieved = await userService.findById(created.id);

    expect(retrieved).toEqual(created);
  });
});
```

### Testing Modules

```typescript
import { createTestContainer, Module, Injectable, inject, InjectionToken } from '@noneforge/ioc';

const API_URL = new InjectionToken<string>('API_URL');

@Injectable()
class ApiClient {
  private apiUrl = inject(API_URL);

  getUrl() {
    return this.apiUrl;
  }
}

@Module({
  providers: [
    { provide: API_URL, useValue: 'https://production.api.com' },
    ApiClient,
  ],
  exports: [ApiClient],
})
class ApiModule {}

describe('ApiModule', () => {
  it('should use production URL by default', () => {
    const container = new Container();
    container.loadModule(ApiModule);

    const client = container.get(ApiClient);
    expect(client.getUrl()).toBe('https://production.api.com');
  });

  it('should allow URL override in tests', () => {
    const container = new TestContainer();
    container.loadModule(ApiModule);
    container.override(API_URL, 'https://test.api.com');

    const client = container.get(ApiClient);
    expect(client.getUrl()).toBe('https://test.api.com');
  });
});
```

### Testing Async Providers

```typescript
describe('Async Providers', () => {
  it('should resolve async provider', async () => {
    const REMOTE_CONFIG = new InjectionToken<Config>('REMOTE_CONFIG');

    const container = createTestContainer({
      provide: REMOTE_CONFIG,
      useAsync: async () => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return { debug: true };
      },
    });

    const config = await container.getAsync(REMOTE_CONFIG);
    expect(config).toEqual({ debug: true });
  });

  it('should mock async provider with sync value', () => {
    const REMOTE_CONFIG = new InjectionToken<Config>('REMOTE_CONFIG');

    const container = createTestContainer({
      provide: REMOTE_CONFIG,
      useValue: { debug: false }, // Sync mock for async provider
    });

    // Can use sync get() with mocked value
    const config = container.get(REMOTE_CONFIG);
    expect(config).toEqual({ debug: false });
  });
});
```

### Testing Scopes

```typescript
describe('Request Scope', () => {
  it('should isolate request-scoped services', () => {
    @Injectable({ scope: 'request' })
    class RequestContext {
      id = Math.random();
    }

    const container = new TestContainer([RequestContext]);

    const request1 = Symbol('request-1');
    const request2 = Symbol('request-2');

    const ctx1a = container.get(RequestContext, { requestId: request1 });
    const ctx1b = container.get(RequestContext, { requestId: request1 });
    const ctx2 = container.get(RequestContext, { requestId: request2 });

    expect(ctx1a.id).toBe(ctx1b.id); // Same request
    expect(ctx1a.id).not.toBe(ctx2.id); // Different requests
  });
});
```

## TestContainer API

```typescript
class TestContainer extends Container {
  // Override provider with value or provider object
  override<T>(token: Token<T>, value: T | Provider<T>): void;

  // Create and register mock
  mock<T>(token: Token<T>, partial: Partial<T>): T;

  // Create spy wrapper
  spy<T>(token: Token<T>): T;

  // Clear internal tracking
  reset(): void;

  // Capture state for later restore
  snapshot(): { providers: Map<Token, Provider>; restore(): void };
}
```

## Best Practices

1. **Use TestContainer for unit tests** - Easy mocking and isolation
2. **Use snapshot/restore in beforeEach/afterEach** - Clean state between tests
3. **Mock external dependencies** - Database, API, file system
4. **Keep real implementations for integration tests** - Verify actual behavior
5. **Use createMockProvider for reusable mocks** - Share mock configurations

## Runnable Example

See [examples/testing](https://github.com/noneforge/ioc/tree/main/examples/testing) for a complete runnable example demonstrating testing patterns.

## Next Steps

- [Lifecycle Hooks](/guide/lifecycle-hooks) - Lifecycle and disposal
- [API Reference](/guide/api-reference) - Complete testing API
