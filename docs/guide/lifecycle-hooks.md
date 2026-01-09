# Lifecycle Hooks

Services can implement lifecycle interfaces to be notified of lifecycle events.

## OnInit

Called after the instance is created and dependencies are injected:

```typescript
import { Injectable, inject, OnInit } from '@noneforge/ioc';

@Injectable()
class DatabaseService implements OnInit {
  private config = inject(CONFIG);
  private connection?: Connection;

  async onInit() {
    console.log('Initializing database connection...');
    this.connection = await createConnection(this.config.dbUrl);
    console.log('Database connected!');
  }

  query(sql: string) {
    return this.connection!.query(sql);
  }
}
```

## OnDestroy

Called when the container is disposed:

```typescript
import { Injectable, OnDestroy } from '@noneforge/ioc';

@Injectable()
class DatabaseService implements OnDestroy {
  private connection?: Connection;

  async onDestroy() {
    if (this.connection) {
      console.log('Closing database connection...');
      await this.connection.close();
    }
  }
}

// Trigger onDestroy
await container.dispose();
```

## OnInject

Called after the instance is injected into another service:

```typescript
import { Injectable, OnInject, InjectionContext } from '@noneforge/ioc';

@Injectable()
class LoggerService implements OnInject {
  private context?: string;

  onInject(context: InjectionContext) {
    // Know who is using this logger
    this.context = String(context.token);
  }

  log(message: string) {
    console.log(`[${this.context}] ${message}`);
  }
}
```

## OnRequest

Called when a request-scoped service is resolved with a specific requestId:

```typescript
import { Injectable, OnRequest } from '@noneforge/ioc';

@Injectable({ scope: 'request' })
class RequestLogger implements OnRequest {
  private requestId?: string | symbol;

  onRequest(requestId: string | symbol) {
    this.requestId = requestId;
    console.log(`Logger initialized for request: ${String(requestId)}`);
  }
}
```

## Disposable

Alternative interface for cleanup:

```typescript
import { Injectable, Disposable } from '@noneforge/ioc';

@Injectable()
class ResourceManager implements Disposable {
  private resources: Resource[] = [];

  async dispose() {
    for (const resource of this.resources) {
      await resource.release();
    }
    this.resources = [];
  }
}
```

## Lifecycle Order

```
┌─────────────────────────────────────────┐
│           Container Creation            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Instance Creation               │
│   (constructor, inject() calls)         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│              onInit()                   │
│   (async initialization allowed)        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│             onInject()                  │
│   (when injected into another service)  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│            Service Ready                │
└─────────────────┬───────────────────────┘
                  │
          container.dispose()
                  │
                  ▼
┌─────────────────────────────────────────┐
│    onDestroy() / dispose()              │
│   (cleanup resources)                   │
└─────────────────────────────────────────┘
```

## Best Practices

1. **Use `onInit` for async setup** - Database connections, API clients
2. **Always implement `onDestroy`** - Clean up resources, close connections
3. **Keep hooks lightweight** - Heavy work should be lazy-loaded
4. **Handle errors in hooks** - Wrap in try/catch to prevent cascading failures

```typescript
@Injectable()
class SafeService implements OnInit, OnDestroy {
  async onInit() {
    try {
      await this.connect();
    } catch (error) {
      console.error('Failed to initialize:', error);
      // Decide: throw or continue in degraded mode
    }
  }

  async onDestroy() {
    try {
      await this.disconnect();
    } catch (error) {
      // Log but don't throw - allow other services to clean up
      console.error('Error during cleanup:', error);
    }
  }
}
```

## Next Steps

- [Scopes](/guide/scopes) - How lifecycle works with different scopes
- [Testing](/guide/testing) - Testing services with lifecycle hooks
- [Bootstrap](/guide/bootstrap) - Application bootstrap and shutdown