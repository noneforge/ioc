# Getting Started

This guide will help you set up @noneforge/ioc in your TypeScript project and understand the basic concepts.

## Installation

Install the package and its peer dependency:

```bash
npm install @noneforge/ioc reflect-metadata
```

Or with yarn:

```bash
yarn add @noneforge/ioc reflect-metadata
```

Or with pnpm:

```bash
pnpm add @noneforge/ioc reflect-metadata
```

## TypeScript Configuration

@noneforge/ioc uses decorators and reflection, which require specific TypeScript compiler options.

Add the following to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true
  }
}
```

The critical options are:
- `experimentalDecorators: true` - Enables decorator syntax
- `emitDecoratorMetadata: true` - Emits type metadata for decorators (required for automatic type resolution)

## Setup

Import `reflect-metadata` **once** at the entry point of your application, before any other imports:

```typescript
// main.ts or index.ts
import 'reflect-metadata';
import { Container } from '@noneforge/ioc';

// Your application code...
```

## Your First Container

The `Container` is the core of the DI system. It holds all registered providers and resolves dependencies.

```typescript
import 'reflect-metadata';
import { Container } from '@noneforge/ioc';

// Create a container
const container = new Container();

// Register a simple value
container.addProvider({
  provide: 'greeting',
  useValue: 'Hello, World!'
});

// Resolve the value
const greeting = container.get('greeting');
console.log(greeting); // Hello, World!
```

## Your First Injectable Service

Use the `@Injectable()` decorator to mark a class as injectable:

```typescript
import 'reflect-metadata';
import { Container, Injectable } from '@noneforge/ioc';

@Injectable()
class GreetingService {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }
}

const container = new Container();
container.addProvider(GreetingService);

const greetingService = container.get(GreetingService);
console.log(greetingService.greet('World')); // Hello, World!
```

## Dependency Injection with inject()

Use the `inject()` function to resolve dependencies. This is the preferred modern approach:

```typescript
import 'reflect-metadata';
import { Container, Injectable, inject } from '@noneforge/ioc';

@Injectable()
class LoggerService {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

@Injectable()
class UserService {
  // Use inject() to get dependencies
  private logger = inject(LoggerService);

  createUser(name: string): void {
    this.logger.log(`Creating user: ${name}`);
  }
}

const container = new Container();
container.addProvider(LoggerService);
container.addProvider(UserService);

const userService = container.get(UserService);
userService.createUser('Alice'); // [LOG] Creating user: Alice
```

> **Note**: The `inject()` function must be called during class field initialization or inside the constructor, while the injection context is active.

## Using InjectionToken

For type-safe injection of non-class values, use `InjectionToken`:

```typescript
import 'reflect-metadata';
import { Container, Injectable, inject, InjectionToken } from '@noneforge/ioc';

// Create typed tokens
const API_URL = new InjectionToken<string>('API_URL');
const API_TIMEOUT = new InjectionToken<number>('API_TIMEOUT');

@Injectable()
class ApiClient {
  private apiUrl = inject(API_URL);
  private timeout = inject(API_TIMEOUT);

  getConfig() {
    return { url: this.apiUrl, timeout: this.timeout };
  }
}

const container = new Container();

container.addProvider({ provide: API_URL, useValue: 'https://api.example.com' });
container.addProvider({ provide: API_TIMEOUT, useValue: 5000 });
container.addProvider(ApiClient);

const client = container.get(ApiClient);
console.log(client.getConfig());
// { url: 'https://api.example.com', timeout: 5000 }
```

## Optional Dependencies

Use `injectOptional()` for dependencies that might not be registered:

```typescript
import { Container, Injectable, injectOptional, InjectionToken } from '@noneforge/ioc';

interface CacheService {
  get(key: string): string | null;
}

const CACHE_SERVICE = new InjectionToken<CacheService>('CACHE_SERVICE');

@Injectable()
class DataService {
  // Returns null if not registered (instead of throwing)
  private cache = injectOptional(CACHE_SERVICE);

  getData(): string {
    if (this.cache) {
      return this.cache.get('data') ?? 'No cached data';
    }
    
    return 'Fetched from source';
  }
}

const container = new Container();
container.addProvider(DataService);
// Note: CACHE_SERVICE is NOT registered

const dataService = container.get(DataService);
console.log(dataService.getData()); // Fetched from source
```

> **Alternative**: You can also use the `@Optional()` decorator with constructor injection as an alternative approach.

## Factory Providers

Create instances with custom logic using factory providers:

```typescript
import { Container, InjectionToken } from '@noneforge/ioc';

interface DatabaseConnection {
  query(sql: string): void;
}

const DB_HOST = new InjectionToken<string>('DB_HOST');
const DB_CONNECTION = new InjectionToken<DatabaseConnection>('DB_CONNECTION');

const container = new Container();

container.addProvider({ provide: DB_HOST, useValue: 'localhost:5432' });

container.addProvider({
  provide: DB_CONNECTION,
  useFactory: (host: string) => {
    console.log(`Connecting to ${host}...`);
    
    return {
      query: (sql: string) => console.log(`Executing: ${sql}`)
    };
  },
  inject: [DB_HOST]
});

const db = container.get(DB_CONNECTION);
// Connecting to localhost:5432...

db.query('SELECT * FROM users');
// Executing: SELECT * FROM users
```

## Runnable Example

See [examples/basic](https://github.com/noneforge/ioc/tree/main/examples/basic) for a complete runnable example demonstrating these concepts.

## Next Steps

Now that you understand the basics, explore more advanced features:

- [Core Concepts](/guide/core-concepts) - Deep dive into tokens and containers
- [Providers](/guide/providers) - All provider types explained
- [Decorators](/guide/decorators) - @Injectable, @Inject, @Optional, @Lazy
- [Scopes](/guide/scopes) - Managing service lifetimes
- [Modules](/guide/modules) - Organizing code with modules
- [Testing](/guide/testing) - Testing with mocks and spies
