# Core Concepts

This document explains the fundamental concepts of @noneforge/ioc: tokens, containers, and the resolution process.

## What is Dependency Injection?

Dependency Injection (DI) is a design pattern where objects receive their dependencies from external sources rather than creating them internally. This promotes:

- **Loose coupling** - Components don't need to know how to create their dependencies
- **Testability** - Dependencies can be easily mocked in tests
- **Flexibility** - Implementations can be swapped without changing consumers
- **Maintainability** - Changes to dependencies don't require changes to consumers

## Tokens

A **token** is an identifier used to register and retrieve dependencies from the container. @noneforge/ioc supports several token types:

### Class Tokens

Classes themselves can be used as tokens:

```typescript
@Injectable()
class UserService {
  getUser(id: number) { /* ... */ }
}

container.addProvider(UserService);
const service = container.get(UserService);
```

### InjectionToken

`InjectionToken<T>` provides type-safe tokens for non-class values:

```typescript
import { InjectionToken } from '@noneforge/ioc';

// String value
const API_URL = new InjectionToken<string>('API_URL');

// Number value
const MAX_RETRIES = new InjectionToken<number>('MAX_RETRIES');

// Object value
interface AppConfig {
  debug: boolean;
  version: string;
}
const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

// Array value
const ENABLED_FEATURES = new InjectionToken<string[]>('ENABLED_FEATURES');
```

### InjectionToken Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `providedIn` | `'root' \| 'platform' \| 'any' \| null` | `null` | Auto-registration scope |
| `factory` | `() => T` | `undefined` | Default factory function |
| `multi` | `boolean` | `false` | Allow multiple providers |
| `scope` | `ProviderScope` | `'singleton'` | Default scope |
| `validator` | `(value) => boolean` | `undefined` | Validation function |
| `transformer` | `(value) => T` | `undefined` | Transform function |

```typescript
const CONFIG = new InjectionToken<Config>('CONFIG', {
  factory: () => ({ debug: false, version: '1.0.0' }),
  scope: 'singleton',
  multi: false,
  validator: (value) => value.version !== undefined,
  transformer: (value) => ({ ...value, loaded: true }),
});
```

### String and Symbol Tokens

For simple cases, strings and symbols can be used:

```typescript
// String token
container.addProvider({ provide: 'apiUrl', useValue: 'https://api.example.com' });
const url = container.get<string>('apiUrl');

// Symbol token
const DB_TOKEN = Symbol('database');
container.addProvider({ provide: DB_TOKEN, useValue: database });
const db = container.get(DB_TOKEN);
```

> **Best Practice**: Prefer `InjectionToken<T>` over strings/symbols for type safety.

## Container

The `Container` is the central registry that holds all providers and resolves dependencies.

### Creating a Container

```typescript
import { Container } from '@noneforge/ioc';

// Empty container
const container = new Container();

// Container with initial providers
const container = new Container([
  { provide: API_URL, useValue: 'https://api.example.com' },
  UserService,
]);

// Container with options
const container = new Container([], undefined, {
  strict: true,    // Throw on missing providers
  debug: false,    // Enable debug logging
});
```

### Container Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strict` | `boolean` | `false` | Throw error when provider not found |
| `lazyLoad` | `boolean` | `false` | Enable lazy loading for all providers |
| `debug` | `boolean` | `false` | Enable debug logging |
| `maxCacheSize` | `number` | `1000` | Max singleton cache size (LRU eviction) |
| `autoDispose` | `boolean` | `false` | Auto-dispose singletons on container dispose |
| `defaultMetadata` | `object` | `{}` | Default metadata for injection contexts |

```typescript
const container = new Container([], undefined, {
  strict: true,
  debug: true,
  maxCacheSize: 500,
});
```

### Registering Providers

```typescript
// Add single provider
container.addProvider(UserService);
container.addProvider({ provide: API_URL, useValue: 'https://api.example.com' });

// Load module with multiple providers
container.loadModule(AppModule);
```

### Resolving Dependencies

```typescript
// Synchronous resolution
const service = container.get(UserService);

// With options
const service = container.get(UserService, {
  optional: true,    // Return null if not found
  skipSelf: true,    // Skip this container, search parent
  self: true,        // Only search this container
  lazy: true,        // Return lazy proxy
});

// Asynchronous resolution (for async providers)
const config = await container.getAsync(RemoteConfig);

// Get all multi-providers
const handlers = container.getAll(EventHandler);
```

### Resolution Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `optional` | `boolean` | `false` | Return null instead of throwing |
| `skipSelf` | `boolean` | `false` | Skip current container, resolve from parent |
| `self` | `boolean` | `false` | Only resolve from current container |
| `lazy` | `boolean` | `false` | Return lazy proxy |
| `proxy` | `boolean` | `false` | Alias for lazy |
| `requestId` | `string \| symbol` | `undefined` | ID for request-scoped services |
| `metadata` | `object` | `undefined` | Additional metadata for interceptors |

**Note on `skipSelf` + `self` combination:**

These options are evaluated in order: `skipSelf` is checked **first**. When both are `true`:
1. `skipSelf: true` causes immediate delegation to parent (with same options)
2. Parent also sees `skipSelf: true`, delegates to its parent
3. This continues until the **root container** (no parent)
4. Root container searches locally (`self: true` has no effect - no parent to skip anyway)

**Result:** `{ skipSelf: true, self: true }` searches **only the root container**. This is a contradictory combination - avoid using both together.

## Container Hierarchy

Containers can form parent-child relationships:

```typescript
// Root container
const rootContainer = new Container([
  { provide: API_URL, useValue: 'https://api.example.com' },
]);

// Child container inherits from parent
const childContainer = rootContainer.createChild([
  { provide: DB_URL, useValue: 'localhost:5432' },
]);

// Child can access parent's providers
const apiUrl = childContainer.get(API_URL); // Works!

// Parent cannot access child's providers
rootContainer.get(DB_URL); // Throws!
```

### Use Cases for Hierarchy

1. **Request Scoping** - Create child container per request
2. **Feature Modules** - Isolate feature-specific providers
3. **Testing** - Override providers in child container

```typescript
// Request handling example
app.use((req, res, next) => {
  // Create request-scoped container
  const requestContainer = rootContainer.createChild([
    { provide: REQUEST, useValue: req },
    { provide: RESPONSE, useValue: res },
  ]);

  req.container = requestContainer;
  next();
});
```

## Resolution Process

When you call `container.get(Token)`, the following steps occur:

1. **Forward Ref Resolution** - If token is a ForwardRef, resolve it
2. **Context Creation** - Create InjectionContext with metadata
3. **Circular Check** - Check for circular dependencies
4. **Provider Lookup** - Find provider in current container or parents
5. **Cache Check** - Check if instance is cached (for singletons)
6. **Interceptor Chain** - Run through interceptors
7. **Instance Creation** - Create instance using provider configuration
8. **Cache Storage** - Store in cache if scoped
9. **Lifecycle Hooks** - Call `onInit` if present

```
container.get(Token)
       │
       ▼
┌──────────────────────┐
│ 1. resolveForwardRef │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Create Context    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌─────────────────┐
│ 3. Check Circular    │────►│ CircularDepError│
└──────────┬───────────┘     └─────────────────┘
           │
           ▼
┌──────────────────────┐     ┌─────────────────┐
│ 4. Find Provider     │────►│ NoProviderError │
└──────────┬───────────┘     └─────────────────┘
           │
           ▼
┌──────────────────────┐     ┌─────────────────┐
│ 5. Check Cache       │────►│ Return cached   │
└──────────┬───────────┘     └─────────────────┘
           │
           ▼
┌──────────────────────┐
│ 6. InterceptorChain  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 7. Create Instance   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 8. Cache Instance    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 9. Lifecycle Hooks   │
└──────────┬───────────┘
           │
           ▼
     Return instance
```

## Checking Provider Existence

```typescript
// Check if provider is registered
if (container.has(UserService)) {
  const service = container.get(UserService);
}
```

## Container Validation

Validate all providers and their dependencies:

```typescript
const result = container.validate();

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}

// Result structure
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

## Container Disposal

Clean up resources when the container is no longer needed:

```typescript
// Dispose all services with onDestroy lifecycle
await container.dispose();
```

## Factory Functions

For convenience, use factory functions:

```typescript
import { createContainer } from '@noneforge/ioc';

// Create container with providers
const container = createContainer(
  { provide: API_URL, useValue: 'https://api.example.com' },
  UserService,
  LoggerService,
);
```

## Next Steps

- [Providers](/guide/providers) - Learn about all provider types
- [Scopes](/guide/scopes) - Understand instance lifecycle
- [Decorators](/guide/decorators) - Use decorators for DI
