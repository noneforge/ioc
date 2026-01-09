# Bootstrap

Initialize your application with lifecycle management and graceful shutdown.

## Quick Start

```typescript
import 'reflect-metadata';
import { bootstrap, Module, Injectable } from '@noneforge/ioc';

@Injectable()
class AppService {
  async onInit() {
    console.log('App started!');
  }

  async onDestroy() {
    console.log('App shutting down...');
  }
}

@Module({
  providers: [AppService],
})
class AppModule {}

// Start the application
const { container } = await bootstrap(AppModule);
```

## bootstrap()

Full application initialization with:
- Module registration
- Lifecycle hooks (`onInit` called)
- Signal handlers (SIGTERM, SIGINT)
- Graceful shutdown

```typescript
import { bootstrap, Module } from '@noneforge/ioc';

@Module({
  imports: [DatabaseModule, CacheModule],
  providers: [AppService, UserService],
})
class AppModule {}

const { app, container } = await bootstrap(AppModule, {
  providers: [
    // Additional providers not in module
    { provide: 'API_KEY', useValue: process.env.API_KEY },
  ],
  strict: true,    // Throw on missing providers
  validate: true,  // Validate dependency graph
  debug: false,    // Enable debug logging
});

// Application is ready
// - All onInit() hooks have been called
// - SIGTERM/SIGINT handlers registered
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `providers` | `Provider[]` | `[]` | Additional providers |
| `strict` | `boolean` | `false` | Throw on missing providers |
| `validate` | `boolean` | `false` | Validate dependency graph |
| `debug` | `boolean` | `false` | Enable debug logging |

### Return Value

```typescript
interface BootstrapResult {
  app: unknown;       // Root module instance (if @Injectable)
  container: Container;
}
```

## createApplication()

Create a container without lifecycle management - useful for libraries or when you need manual control:

```typescript
import { createApplication, Module } from '@noneforge/ioc';

@Module({
  providers: [UserService, OrderService],
})
class AppModule {}

// Just creates container, no signal handlers
const container = createApplication(AppModule, {
  providers: [],
  strict: true,
  debug: false,
});

// Manually get services
const userService = container.get(UserService);

// Manually dispose when done
await container.dispose();
```

## Lifecycle Flow

```
bootstrap(AppModule)
        │
        ▼
┌───────────────────┐
│  Create Container │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Register Modules  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Validate Graph    │  ← If validate: true
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Call onInit()     │  ← All services with OnInit
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Register Signals  │  ← SIGTERM, SIGINT
└─────────┬─────────┘
          │
          ▼
    App is Ready
          │
    (on SIGTERM/SIGINT)
          │
          ▼
┌───────────────────┐
│ Call onDestroy()  │  ← Graceful shutdown
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  container.dispose()
└───────────────────┘
```

## Examples

### HTTP Server

```typescript
import { bootstrap, Module, Injectable, OnInit, OnDestroy } from '@noneforge/ioc';
import { createServer, Server } from 'http';

@Injectable()
class HttpServer implements OnInit, OnDestroy {
  private server?: Server;

  async onInit() {
    this.server = createServer((req, res) => {
      res.end('Hello!');
    });

    await new Promise<void>(resolve => {
      this.server!.listen(3000, resolve);
    });

    console.log('Server listening on :3000');
  }

  async onDestroy() {
    if (this.server) {
      await new Promise<void>(resolve => {
        this.server!.close(() => resolve());
      });
      console.log('Server closed');
    }
  }
}

@Module({
  providers: [HttpServer],
})
class AppModule {}

await bootstrap(AppModule);
// Server starts, handles requests
// On SIGTERM: gracefully closes connections
```

### Database Connection

```typescript
@Injectable()
class Database implements OnInit, OnDestroy {
  private connection?: Connection;

  async onInit() {
    this.connection = await createConnection({
      host: 'localhost',
      database: 'myapp',
    });
    console.log('Database connected');
  }

  async onDestroy() {
    await this.connection?.close();
    console.log('Database disconnected');
  }

  query(sql: string) {
    return this.connection!.query(sql);
  }
}

@Module({
  providers: [Database, UserRepository, UserService],
})
class AppModule {}

await bootstrap(AppModule);
```

### Multiple Environments

```typescript
const isDev = process.env.NODE_ENV === 'development';

await bootstrap(AppModule, {
  providers: [
    isDev
      ? { provide: Logger, useClass: ConsoleLogger }
      : { provide: Logger, useClass: CloudLogger },
  ],
  debug: isDev,
  strict: !isDev,
});
```

## When to Use What

| Use Case | Function |
|----------|----------|
| **Application entry point** | `bootstrap()` |
| **Libraries** | `createApplication()` |
| **Tests** | `TestContainer` |
| **Manual lifecycle control** | `createApplication()` |
| **Serverless functions** | `createApplication()` |

## Next Steps

- [Modules](/guide/modules) - Organizing providers
- [Lifecycle Hooks](/guide/lifecycle-hooks) - OnInit, OnDestroy
- [Testing](/guide/testing) - Testing bootstrapped apps