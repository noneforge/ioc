# @noneforge/ioc

> Powerful, type-safe dependency injection container for TypeScript

[![npm version](https://img.shields.io/npm/v/@noneforge/ioc.svg)](https://www.npmjs.com/package/@noneforge/ioc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

---

### **[View Full Documentation](https://noneforge.github.io/ioc/)**

[Getting Started](https://noneforge.github.io/ioc/guide/getting-started.html) · [Core Concepts](https://noneforge.github.io/ioc/guide/core-concepts.html) · [API Reference](https://noneforge.github.io/ioc/guide/api-reference.html)

---

A modern, feature-rich Dependency Injection container for TypeScript applications. Built with developer experience in mind, featuring decorators, modules, interceptors, and comprehensive testing utilities.

## Features

- **Full DI Support** - Constructor injection, property injection, and factory providers
- **Type-Safe** - Leverages TypeScript for compile-time safety with `InjectionToken<T>`
- **5 Provider Types** - Class, Value, Factory, Existing (alias), and Async providers
- **5 Scopes** - Singleton, Transient, Request, Prototype, and Scoped
- **Decorator-Based** - `@Injectable`, `@Inject`, `@Optional`, `@Lazy`
- **Module System** - Organize code with `@Module`, dynamic modules, and configurable modules
- **Interceptors** - Built-in caching, logging, retry, and validation interceptors
- **Testing Utilities** - `TestContainer` with mock, spy, and snapshot support
- **AOP Decorators** - `@Cached`, `@Log`, `@Transactional` for cross-cutting concerns
- **Lifecycle Hooks** - `onInit`, `onDestroy` for resource management
- **Hierarchical Containers** - Parent/child container relationships
- **Cycle Detection** - Automatic circular dependency detection with Tarjan's algorithm
- **Zero Dependencies** - Only requires `reflect-metadata` as peer dependency

## Installation

```bash
npm install @noneforge/ioc reflect-metadata
```

**Required peer dependencies:**
- `reflect-metadata` >= 0.2.0
- `typescript` >= 5.0

### TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

Import `reflect-metadata` once at your application entry point:

```typescript
import 'reflect-metadata';
```

## Quick Start

### Basic Usage

```typescript
import 'reflect-metadata';
import { Container, Injectable, inject, InjectionToken } from '@noneforge/ioc';

// Define a service
@Injectable()
class LoggerService {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

// Define another service with dependency using inject()
@Injectable()
class UserService {
  private logger = inject(LoggerService);

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
    
    return { id: 1, name };
  }
}

// Create container and resolve
const container = new Container();
container.addProvider(LoggerService);
container.addProvider(UserService);

const userService = container.get(UserService);
userService.createUser('John'); // [LOG] Creating user: John
```

### Using Injection Tokens

```typescript
import { InjectionToken, Container } from '@noneforge/ioc';

// Create type-safe tokens
const API_URL = new InjectionToken<string>('API_URL');
const MAX_RETRIES = new InjectionToken<number>('MAX_RETRIES');

const container = new Container();

// Register values
container.addProvider({ provide: API_URL, useValue: 'https://api.example.com' });
container.addProvider({ provide: MAX_RETRIES, useValue: 3 });

// Resolve with type safety
const apiUrl = container.get(API_URL); // string
const maxRetries = container.get(MAX_RETRIES); // number
```

### Using Modules

```typescript
import { Module, Injectable, inject, InjectionToken, bootstrap } from '@noneforge/ioc';

const CONFIG = new InjectionToken<{ apiUrl: string }>('CONFIG');

@Injectable()
class ApiService {
  private config = inject(CONFIG);

  getUrl() {
    return this.config.apiUrl;
  }
}

@Module({
  providers: [
    { provide: CONFIG, useValue: { apiUrl: 'https://api.example.com' } },
    ApiService,
  ],
  exports: [ApiService],
})
class ApiModule {}

@Module({
  imports: [ApiModule],
})
class AppModule {}

// Bootstrap the application
const { app, container } = await bootstrap(AppModule);
const apiService = container.get(ApiService);
```

### Testing with Mocks

```typescript
import { createTestContainer, createMockProvider } from '@noneforge/ioc';

// Create test container with mocks
const container = createTestContainer(
  createMockProvider(LoggerService, {
    log: vi.fn(),
  }),
  UserService,
);

const userService = container.get(UserService);
userService.createUser('Test');

// Verify mock was called
expect(container.get(LoggerService).log).toHaveBeenCalledWith('Creating user: Test');
```

## Core Concepts

### Providers

```typescript
// Class Provider - instantiate a class
{ provide: MyService, useClass: MyService }

// Value Provider - use a constant value
{ provide: API_KEY, useValue: 'secret-key' }

// Factory Provider - create with dependencies
{
  provide: DatabaseConnection,
  useFactory: (config: Config) => new Database(config.dbUrl),
  inject: [Config]
}

// Existing Provider - alias to another token
{ provide: ILogger, useExisting: ConsoleLogger }

// Async Provider - async initialization
{ provide: RemoteConfig, useAsync: () => fetch('/config').then(r => r.json()) }
```

### Scopes

```typescript
@Injectable({ scope: 'singleton' })  // Default - one instance per container
class SingletonService {}

@Injectable({ scope: 'transient' })  // New instance every time
class TransientService {}

@Injectable({ scope: 'request' })    // One instance per request ID
class RequestScopedService {}
```

### inject() Functions (Preferred)

```typescript
inject(Token)              // Resolve dependency
injectOptional(Token)      // Allow null if not found
injectLazy(Token)          // Defer resolution until first access
injectAll(Token)           // Get all multi-providers
```

### Decorators (Alternative)

```typescript
@Injectable()              // Mark class as injectable
@Inject(Token)             // Specify injection token (alternative to inject())
@Optional()                // Allow null if not found (alternative to injectOptional())
@Lazy()                    // Defer resolution (alternative to injectLazy())
```

## Documentation

- [Getting Started](./docs/getting-started.md) - Installation and first steps
- [Core Concepts](./docs/core-concepts.md) - Tokens, containers, and resolution
- [Providers](./docs/providers.md) - All provider types explained
- [Scopes](./docs/scopes.md) - Lifecycle management
- [Decorators](./docs/decorators.md) - Injectable, Inject, Optional, Lazy
- [Modules](./docs/modules.md) - Module system and composition
- [Interceptors](./docs/interceptors.md) - Built-in and custom interceptors
- [Testing](./docs/testing.md) - TestContainer and mocking
- [Advanced](./docs/advanced.md) - Lifecycle hooks, cache, plugins
- [API Reference](./docs/api-reference.md) - Complete API documentation

## Comparison with Alternatives

| Feature | @noneforge/ioc | InversifyJS | TSyringe | TypeDI |
|---------|----------------|-------------|----------|--------|
| Decorator-based DI | Yes | Yes | Yes | Yes |
| Injection Tokens | Yes | Yes | Yes | Yes |
| Module System | Yes | Yes | No | No |
| Built-in Interceptors | Yes | Yes | Yes | No |
| Testing Utilities | Yes | No | No | No |
| AOP Decorators | Yes | No | No | No |
| Cycle Detection | Yes | Yes | Yes | No |
| Dependency Graph | Yes | No | No | No |
| Request Scope | Yes | Yes | Yes | Yes |
| Async Providers | Yes | Yes | Yes | Yes |
| Conditional Providers | Yes | Yes | No | No |
| EnhancedCache (LRU/LFU) | Yes | No | No | No |

## Examples

See the [examples](./examples) directory for runnable code samples:

- [Basic DI](./examples/basic) - Simple dependency injection
- [Modules](./examples/modules) - Module system usage
- [Interceptors](./examples/interceptors) - Using interceptors
- [Scopes](./examples/scopes) - Scope management
- [Testing](./examples/testing) - Testing patterns

## Requirements

- Node.js >= 18.18.0
- TypeScript >= 5.0
- `reflect-metadata` >= 0.2.0

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.

## License

MIT License - see [LICENSE](./LICENSE) for details.
