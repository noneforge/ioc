# Providers

Providers tell the container how to create instances of dependencies. @noneforge/ioc supports five types of providers, plus the ability to use classes directly as providers.

## Provider Types Overview

| Type | Syntax | Use Case |
|------|--------|----------|
| Class Provider | `useClass` | Create instance of a class |
| Value Provider | `useValue` | Use a constant value |
| Factory Provider | `useFactory` | Create with custom logic |
| Existing Provider | `useExisting` | Create alias to another token |
| Async Provider | `useAsync` | Async initialization |

## Class Provider

Use a class as the implementation. The container will instantiate the class and inject its dependencies.

### Basic Usage

```typescript
import { Container, Injectable, InjectionToken } from '@noneforge/ioc';

@Injectable()
class UserService {
  getUser(id: number) {
    return { id, name: 'John' };
  }
}

// Shorthand - class is both token and implementation
container.addProvider(UserService);

// Explicit - can use different implementation
container.addProvider({
  provide: UserService,
  useClass: UserService,
});
```

### Interface Token with Class Implementation

```typescript
interface ILogger {
  log(message: string): void;
}

const LOGGER = new InjectionToken<ILogger>('LOGGER');

@Injectable()
class ConsoleLogger implements ILogger {
  log(message: string) {
    console.log(message);
  }
}

container.addProvider({
  provide: LOGGER,
  useClass: ConsoleLogger,
});

const logger = container.get(LOGGER);
logger.log('Hello!');
```

### Class Provider Options

```typescript
interface ClassProvider<T> {
  provide: Token<T>;
  useClass: Constructor<T>;
  scope?: ProviderScope;        // 'singleton' | 'transient' | 'request' | 'prototype' | 'scoped'
  lazy?: boolean;               // Defer instantiation
  multi?: boolean;              // Allow multiple providers
  when?: (ctx: InjectionContext) => boolean;  // Conditional resolution
  interceptors?: Interceptor[]; // Provider-specific interceptors
  metadata?: Record<string, unknown>;  // Custom metadata
  tags?: string[];              // Tags for filtering
}
```

### Swapping Implementations

```typescript
// Development
container.addProvider({
  provide: LOGGER,
  useClass: ConsoleLogger,
});

// Production
container.addProvider({
  provide: LOGGER,
  useClass: CloudLogger,
});

// Test
container.addProvider({
  provide: LOGGER,
  useClass: MockLogger,
});
```

## Value Provider

Provide a constant value directly. No instantiation is performed.

### Basic Usage

```typescript
import { InjectionToken } from '@noneforge/ioc';

const API_URL = new InjectionToken<string>('API_URL');
const MAX_RETRIES = new InjectionToken<number>('MAX_RETRIES');
const FEATURES = new InjectionToken<string[]>('FEATURES');

container.addProvider({
  provide: API_URL,
  useValue: 'https://api.example.com',
});

container.addProvider({
  provide: MAX_RETRIES,
  useValue: 3,
});

container.addProvider({
  provide: FEATURES,
  useValue: ['auth', 'payments', 'notifications'],
});
```

### Configuration Objects

```typescript
interface AppConfig {
  apiUrl: string;
  debug: boolean;
  version: string;
}

const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

container.addProvider({
  provide: APP_CONFIG,
  useValue: {
    apiUrl: 'https://api.example.com',
    debug: process.env.NODE_ENV !== 'production',
    version: '1.0.0',
  },
});
```

### Value Provider Options

```typescript
interface ValueProvider<T> {
  provide: Token<T>;
  useValue: T;
  multi?: boolean;              // Allow multiple providers
  when?: (ctx: InjectionContext) => boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

## Factory Provider

Create instances using a custom factory function. Useful when you need complex initialization logic or runtime values.

### Basic Usage

```typescript
const DB_CONNECTION = new InjectionToken<Database>('DB_CONNECTION');

container.addProvider({
  provide: DB_CONNECTION,
  useFactory: () => {
    return new Database({
      host: 'localhost',
      port: 5432,
    });
  },
});
```

### With Dependencies

Use `inject` to specify dependencies passed to the factory:

```typescript
const DB_HOST = new InjectionToken<string>('DB_HOST');
const DB_PORT = new InjectionToken<number>('DB_PORT');
const DB_CONNECTION = new InjectionToken<Database>('DB_CONNECTION');

container.addProvider({ provide: DB_HOST, useValue: 'localhost' });
container.addProvider({ provide: DB_PORT, useValue: 5432 });

container.addProvider({
  provide: DB_CONNECTION,
  useFactory: (host: string, port: number) => {
    console.log(`Connecting to ${host}:${port}...`);
    
    return new Database({ host, port });
  },
  inject: [DB_HOST, DB_PORT],
});
```

### Using Services in Factory

```typescript
@Injectable()
class ConfigService {
  getDatabaseUrl(): string {
    return process.env.DATABASE_URL ?? 'localhost:5432';
  }
}

container.addProvider(ConfigService);

container.addProvider({
  provide: DB_CONNECTION,
  useFactory: (config: ConfigService) => {
    return new Database(config.getDatabaseUrl());
  },
  inject: [ConfigService],
});
```

### Factory Provider Options

```typescript
interface FactoryProvider<T> {
  provide: Token<T>;
  useFactory: (...deps: any[]) => T | Promise<T>;
  inject?: Token[];             // Dependencies for the factory
  scope?: ProviderScope;
  lazy?: boolean;
  multi?: boolean;
  when?: (ctx: InjectionContext) => boolean;
  interceptors?: Interceptor[];
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

## Existing Provider (Alias)

Create an alias to another token. When the alias token is resolved, the original token's provider is used.

### Basic Usage

```typescript
interface ILogger {
  log(message: string): void;
}

const LOGGER = new InjectionToken<ILogger>('LOGGER');
const APP_LOGGER = new InjectionToken<ILogger>('APP_LOGGER');

@Injectable()
class ConsoleLogger implements ILogger {
  log(message: string) {
    console.log(message);
  }
}

// Register the actual implementation
container.addProvider({
  provide: LOGGER,
  useClass: ConsoleLogger,
});

// Create an alias
container.addProvider({
  provide: APP_LOGGER,
  useExisting: LOGGER,
});

// Both resolve to the same instance
const logger1 = container.get(LOGGER);
const logger2 = container.get(APP_LOGGER);
console.log(logger1 === logger2); // true (for singletons)
```

### Use Cases

1. **Backward compatibility** - Rename tokens without breaking existing code
2. **Interface abstraction** - Multiple interfaces pointing to same implementation
3. **Feature flags** - Switch implementations via alias

```typescript
// Abstract interface
const PAYMENT_PROCESSOR = new InjectionToken<PaymentProcessor>('PAYMENT_PROCESSOR');

// Concrete implementations
const STRIPE_PROCESSOR = new InjectionToken<StripeProcessor>('STRIPE_PROCESSOR');
const PAYPAL_PROCESSOR = new InjectionToken<PayPalProcessor>('PAYPAL_PROCESSOR');

container.addProvider({ provide: STRIPE_PROCESSOR, useClass: StripeProcessor });
container.addProvider({ provide: PAYPAL_PROCESSOR, useClass: PayPalProcessor });

// Use alias to select implementation
container.addProvider({
  provide: PAYMENT_PROCESSOR,
  useExisting: process.env.PAYMENT === 'paypal' ? PAYPAL_PROCESSOR : STRIPE_PROCESSOR,
});
```

### Existing Provider Options

```typescript
interface ExistingProvider<T> {
  provide: Token<T>;
  useExisting: Token<T>;
  multi?: boolean;
  when?: (ctx: InjectionContext) => boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

## Async Provider

For dependencies that require asynchronous initialization. Must be resolved using `getAsync()`.

### Basic Usage

```typescript
const REMOTE_CONFIG = new InjectionToken<RemoteConfig>('REMOTE_CONFIG');

container.addProvider({
  provide: REMOTE_CONFIG,
  useAsync: async () => {
    const response = await fetch('https://config.example.com/app');
    
    return response.json();
  },
});

// Must use getAsync
const config = await container.getAsync(REMOTE_CONFIG);
```

### With Dependencies

```typescript
const API_URL = new InjectionToken<string>('API_URL');
const REMOTE_CONFIG = new InjectionToken<RemoteConfig>('REMOTE_CONFIG');

container.addProvider({ provide: API_URL, useValue: 'https://api.example.com' });

container.addProvider({
  provide: REMOTE_CONFIG,
  useAsync: async (apiUrl: string) => {
    const response = await fetch(`${apiUrl}/config`);
    
    return response.json();
  },
  inject: [API_URL],
});

const config = await container.getAsync(REMOTE_CONFIG);
```

### Use Cases

1. **Remote configuration** - Load config from external service
2. **Database connections** - Establish connection pools
3. **API clients** - Initialize with authentication

```typescript
const DB_POOL = new InjectionToken<Pool>('DB_POOL');

container.addProvider({
  provide: DB_POOL,
  useAsync: async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Verify connection works
    await pool.query('SELECT 1');
    
    return pool;
  },
});
```

### Async Provider Options

```typescript
interface AsyncProvider<T> {
  provide: Token<T>;
  useAsync: (...deps: any[]) => Promise<T>;
  inject?: Token[];
  scope?: ProviderScope;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
```

## Multi-Providers

Register multiple implementations for the same token. All implementations are returned as an array.

### Basic Usage

```typescript
const EVENT_HANDLER = new InjectionToken<EventHandler>('EVENT_HANDLER');

container.addProvider({
  provide: EVENT_HANDLER,
  useClass: LoggingHandler,
  multi: true,
});

container.addProvider({
  provide: EVENT_HANDLER,
  useClass: MetricsHandler,
  multi: true,
});

container.addProvider({
  provide: EVENT_HANDLER,
  useClass: NotificationHandler,
  multi: true,
});

// Get all handlers
const handlers = container.getAll(EVENT_HANDLER);
// [LoggingHandler, MetricsHandler, NotificationHandler]

for (const handler of handlers) {
  handler.handle(event);
}
```

### Use Cases

1. **Plugin systems** - Register multiple plugins
2. **Event handlers** - Multiple handlers for same event
3. **Validators** - Chain of validators
4. **Middleware** - Multiple middleware functions

### Important: get() vs getAll() Behavior

| Scenario | Result |
|----------|--------|
| `multi: true` + `get()` | Returns **first** registered multi-provider |
| No `multi` + `getAll()` | Returns **empty array** `[]` |

```typescript
// Example: multi-only token with get()
container.addProvider({ provide: TOKEN, useValue: 'first', multi: true });
container.addProvider({ provide: TOKEN, useValue: 'second', multi: true });

container.get(TOKEN);     // 'first' (fallback to first provider)
container.getAll(TOKEN);  // ['first', 'second']

// Example: non-multi token with getAll()
container.addProvider({ provide: OTHER, useValue: 'single' });

container.get(OTHER);     // 'single'
container.getAll(OTHER);  // [] (empty - no multi providers)
```

> **Recommendation:** Always use `getAll()` for multi-providers and `get()` for single providers.

## Conditional Providers

Use the `when` option to conditionally activate providers based on runtime context.

### Using defaultMetadata

Set default metadata when creating the container - it will be available in all `when` callbacks:

```typescript
// Option 1: Providers in constructor
const container = new Container(
  [
    {
      provide: LOGGER,
      useClass: DebugLogger,
      when: (ctx) => ctx.metadata.get('environment') === 'development',
    },
    {
      provide: LOGGER,
      useClass: ProductionLogger,
      when: (ctx) => ctx.metadata.get('environment') === 'production',
    },
  ],
  undefined,  // no parent
  {
    defaultMetadata: {
      environment: process.env.NODE_ENV ?? 'development'
    }
  }
);

// Option 2: Add providers separately
const container2 = new Container([], undefined, {
  defaultMetadata: {
    environment: process.env.NODE_ENV ?? 'development'
  }
});

container2.addProvider({
  provide: LOGGER,
  useClass: DebugLogger,
  when: (ctx) => ctx.metadata.get('environment') === 'development',
});

container2.addProvider({
  provide: LOGGER,
  useClass: ProductionLogger,
  when: (ctx) => ctx.metadata.get('environment') === 'production',
});

// Now conditional providers work automatically
const logger = container.get(LOGGER);  // Returns DebugLogger or ProductionLogger
```

### Per-call Metadata Override

You can override default metadata for specific resolutions:

```typescript
// Uses defaultMetadata (e.g., 'production')
const prodLogger = container.get(LOGGER);

// Override for this specific call
const testLogger = container.get(LOGGER, {
  metadata: { environment: 'test' }
});
```

### Metadata Merging

Per-call metadata is merged with defaultMetadata (per-call overrides default):

```typescript
const container = new Container(providers, undefined, {
  defaultMetadata: {
    environment: 'production',
    version: '1.0.0',
  }
});

container.get(TOKEN, {
  metadata: { requestId: 'abc123' }  // Adds to default
});
// ctx.metadata contains: environment, version, requestId

container.get(TOKEN, {
  metadata: { environment: 'test' }  // Overrides default
});
// ctx.metadata contains: environment='test', version='1.0.0'
```

### Typed Metadata (Autocomplete)

Define a metadata interface for full autocomplete in `when` callbacks - both keys AND values:

```typescript
// Define your metadata shape
interface AppMetadata {
  environment: 'development' | 'production' | 'test';
  version: string;
  featureFlags: Record<string, boolean>;
}

// Pass type to Container
const container = new Container<AppMetadata>(
  [
    {
      provide: LOGGER,
      useClass: DebugLogger,
      when: (ctx) => ctx.metadata.get('environment') === 'development',
      //                               ^^^^^^^^^^^        ^^^^^^^^^^^^
      //                               autocomplete!      autocomplete!
    },
  ],
  undefined,
  {
    defaultMetadata: {
      environment: 'production',
      version: '1.0.0',
      featureFlags: { darkMode: true },
    }
  }
);
```

**What you get:**
- `ctx.metadata.get('environment')` → autocomplete for `'environment' | 'version' | 'featureFlags'`
- Return type is `'development' | 'production' | 'test'` → autocomplete when comparing!
- `ctx.metadata.get('unknownKey')` → still works, returns `unknown`

## Provider Helpers

Convenience functions for creating providers:

```typescript
import { createProvider, createAsyncProvider, provideIf } from '@noneforge/ioc';

// Create provider with type inference
const provider = createProvider(LOGGER, ConsoleLogger, { scope: 'singleton' });

// Create async provider
const asyncProvider = createAsyncProvider(CONFIG, async () => {
  return fetch('/config').then(r => r.json());
});

// Conditional provider (returns null if condition is false)
const debugProvider = provideIf(
  process.env.DEBUG === 'true',
  { provide: DEBUG_SERVICE, useClass: DebugService }
);
```

## Best Practices

1. **Use InjectionToken for non-class values** - Provides type safety
2. **Prefer Class Providers for services** - Automatic dependency resolution
3. **Use Factory Providers for complex initialization** - Full control over creation
4. **Use Async Providers sparingly** - Only when truly async initialization is needed
5. **Group related providers in Modules** - Better organization

## Next Steps

- [Scopes](/guide/scopes) - Control instance lifecycle
- [Decorators](/guide/decorators) - Configure providers with decorators
- [Modules](/guide/modules) - Organize providers into modules
