# Scopes

Scopes control the lifecycle and sharing behavior of dependency instances. @noneforge/ioc supports five scopes.

## Scope Overview

| Scope | Instances | Caching | Use Case |
|-------|-----------|---------|----------|
| `singleton` | One per container | Yes | Shared services, config |
| `transient` | New every time | No | Stateless utilities |
| `request` | One per request ID | Yes (per request) | HTTP request context |
| `prototype` | New with shared prototype | No | Object factories |
| `scoped` | One per custom scope | Yes (per scope) | Custom lifecycles |

## Singleton Scope

**Default scope.** Creates one instance per container and reuses it for all requests.

```typescript
import { Injectable, inject } from '@noneforge/ioc';

@Injectable({ scope: 'singleton' })
class ConfigService {
  private settings = { debug: false };

  setDebug(value: boolean) {
    this.settings.debug = value;
  }

  isDebug() {
    return this.settings.debug;
  }
}

@Injectable()
class ServiceA {
  private config = inject(ConfigService);
}

@Injectable()
class ServiceB {
  private config = inject(ConfigService);
}

// ServiceA and ServiceB share the same ConfigService instance
const serviceA = container.get(ServiceA);
const serviceB = container.get(ServiceB);

serviceA.config.setDebug(true);
console.log(serviceB.config.isDebug()); // true - same instance!
```

### When to Use Singleton

- Configuration services
- Database connection pools
- Caches
- Loggers
- Any service that should be shared

## Transient Scope

Creates a new instance for every resolution request.

```typescript
import { Injectable, inject, InjectionToken } from '@noneforge/ioc';

@Injectable({ scope: 'transient' })
class RequestIdGenerator {
  readonly id = Math.random().toString(36).substring(7);
}

@Injectable()
class RequestHandler {
  private idGen = inject(RequestIdGenerator);

  getId() {
    return this.idGen.id;
  }
}

// Each resolution creates new instance
const handler1 = container.get(RequestHandler);
const handler2 = container.get(RequestHandler);

console.log(handler1.getId()); // 'abc123'
console.log(handler2.getId()); // 'xyz789' - different!
```

### When to Use Transient

- Stateless utilities
- Objects that should not be shared
- When each consumer needs its own instance
- Factory-like behavior

## Request Scope

Creates one instance per request ID. Useful for HTTP request-scoped data.

```typescript
import { Injectable, inject, InjectionToken } from '@noneforge/ioc';

@Injectable({ scope: 'request' })
class RequestContext {
  userId?: string;
  startTime = Date.now();

  setUser(id: string) {
    this.userId = id;
  }
}

@Injectable()
class UserService {
  private ctx = inject(RequestContext);

  getCurrentUser() {
    return this.ctx.userId;
  }
}

@Injectable()
class AuditService {
  private ctx = inject(RequestContext);

  getRequestDuration() {
    return Date.now() - this.ctx.startTime;
  }
}
```

### Using Request Scope

Pass `requestId` when resolving:

```typescript
// Create unique ID for this request
const requestId = Symbol('request-1');

// All resolutions with same requestId share instances
const userService = container.get(UserService, { requestId });
const auditService = container.get(AuditService, { requestId });

// Both share the same RequestContext
```

### HTTP Middleware Example

```typescript
import express from 'express';

const app = express();

app.use((req, res, next) => {
  // Create request-scoped container or use requestId
  const requestId = Symbol(`request-${Date.now()}`);
  req.requestId = requestId;

  // Attach container reference
  req.resolve = <T>(token: Token<T>) => container.get(token, { requestId });

  next();
});

app.get('/users/:id', (req, res) => {
  const userService = req.resolve(UserService);
  const user = userService.getUser(req.params.id);
  res.json(user);
});
```

### When to Use Request Scope

- HTTP request context
- User session data
- Database transactions
- Any request-specific state

## Prototype Scope

Creates a new instance each time, but instances share the same prototype. Useful for object factories.

```typescript
import { Injectable } from '@noneforge/ioc';

@Injectable({ scope: 'prototype' })
class GameEntity {
  x = 0;
  y = 0;

  move(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }
}

// Each resolution creates new instance
const entity1 = container.get(GameEntity);
const entity2 = container.get(GameEntity);

entity1.move(10, 20);
console.log(entity1.x, entity1.y); // 10, 20
console.log(entity2.x, entity2.y); // 0, 0 - different instance

// But they share the prototype
console.log(Object.getPrototypeOf(entity1) === Object.getPrototypeOf(entity2)); // true
```

### Prototype vs Transient

| Aspect | Prototype | Transient |
|--------|-----------|-----------|
| Instance creation | New each time | New each time |
| Prototype chain | Shared | Independent |
| Memory | Slightly more efficient | Standard |

## Scoped (Custom Scope)

Creates instances within custom-defined scopes managed by `ScopeManager`.

```typescript
import { Injectable, Container } from '@noneforge/ioc';

@Injectable({ scope: 'scoped' })
class TenantService {
  constructor(public tenantId: string) {}
}

// Create scopes for different tenants
const tenant1Scope = container.createScope('tenant-1');
const tenant2Scope = container.createScope('tenant-2');

// Each scope has its own instance
const service1 = container.get(TenantService, { scopeId: 'tenant-1' });
const service2 = container.get(TenantService, { scopeId: 'tenant-2' });
```

### When to Use Custom Scopes

- Multi-tenant applications
- Feature-specific contexts
- Complex lifecycle requirements

## Setting Scope

### Via @Injectable Decorator

```typescript
@Injectable({ scope: 'transient' })
class TransientService {}

@Injectable({ scope: 'singleton' })
class SingletonService {}

@Injectable({ scope: 'request' })
class RequestScopedService {}
```

### Via Provider Configuration

```typescript
container.addProvider({
  provide: MyService,
  useClass: MyServiceImpl,
  scope: 'transient',
});

container.addProvider({
  provide: CONFIG,
  useValue: { debug: true },
  // Value providers are always effectively singleton
});

container.addProvider({
  provide: DB_CONNECTION,
  useFactory: () => createConnection(),
  scope: 'singleton',
});
```

## Scope Hierarchy

Child containers inherit parent scopes:

```typescript
const rootContainer = new Container([
  { provide: GlobalConfig, useClass: GlobalConfig, scope: 'singleton' },
]);

const childContainer = rootContainer.createChild([
  { provide: LocalConfig, useClass: LocalConfig, scope: 'singleton' },
]);

// Singleton in child doesn't affect parent
const rootGlobal = rootContainer.get(GlobalConfig);
const childGlobal = childContainer.get(GlobalConfig);

console.log(rootGlobal === childGlobal); // true - shared from parent
```

## Scope and Lifecycle Hooks

Scoped instances receive lifecycle callbacks:

```typescript
import { Injectable, OnInit, OnDestroy } from '@noneforge/ioc';

@Injectable({ scope: 'request' })
class RequestHandler implements OnInit, OnDestroy {
  async onInit() {
    console.log('Request handler initialized');
  }

  async onDestroy() {
    console.log('Request handler destroyed');
    // Called when scope/container is disposed
  }
}

// Dispose container to trigger onDestroy
await container.dispose();
```

## Cache Statistics

Singleton instances are cached in `EnhancedCache`:

```typescript
const stats = container.getStatistics();
console.log(stats);
// {
//   resolutions: 150,
//   creates: 25,
//   cacheHits: 125,
//   errors: 0
// }
```

## Best Practices

1. **Default to singleton** - Most services should be singletons
2. **Use transient for stateless services** - When shared state is not needed
3. **Use request scope for HTTP** - Per-request data isolation
4. **Be careful with singleton + transient mixing** - Transient in singleton can cause issues
5. **Dispose containers properly** - Call `dispose()` to clean up resources

### Scope Mismatch Warning

Be careful when injecting transient services into singletons:

```typescript
// WARNING: This can cause issues
@Injectable({ scope: 'singleton' })
class SingletonService {
  // TransientService is resolved once when SingletonService is created
  private transient = inject(TransientService);
}

// Better: Use lazy injection
@Injectable({ scope: 'singleton' })
class BetterSingletonService {
  private getTransient = injectLazy(TransientService);

  doWork() {
    // Each call gets fresh transient (via lazy resolution)
    const transient = this.getTransient.resolve();
  }
}
```

## Runnable Example

See [examples/scopes](https://github.com/noneforge/ioc/tree/main/examples/scopes) for a complete runnable example demonstrating all 5 scopes.

## Next Steps

- [Modules](/guide/modules) - Organizing providers
- [Testing](/guide/testing) - Scope management in tests
- [Lifecycle Hooks](/guide/lifecycle-hooks) - Lifecycle hooks and disposal
