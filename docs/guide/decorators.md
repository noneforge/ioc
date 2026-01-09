# Decorators

Decorators for dependency injection configuration and aspect-oriented programming.

## @Injectable()

Marks a class as injectable. Required for any class that will be managed by the container.

```typescript
import { Injectable } from '@noneforge/ioc';

@Injectable()
class UserService {
  getUser(id: number) {
    return { id, name: 'John' };
  }
}
```

### @Injectable() Options

```typescript
@Injectable({
  // Auto-register in global registry
  providedIn: 'root' | 'platform' | 'any' | null,

  // Instance scope
  scope: 'singleton' | 'transient' | 'request' | 'prototype' | 'scoped',

  // Tags for filtering
  tags: ['feature-a', 'core'],
})
class MyService {}
```

### providedIn Options

| Value | Behavior |
|-------|----------|
| `'root'` | Auto-registered as singleton in root container |
| `'platform'` | Shared across multiple applications |
| `'any'` | New instance for each lazy-loaded module |
| `null` | Not auto-registered (must be explicitly provided) |

```typescript
// Auto-registered globally
@Injectable({ providedIn: 'root' })
class GlobalService {}

// Must be explicitly provided
@Injectable({ providedIn: null })
class ExplicitService {}

// Or just @Injectable() which defaults to null
@Injectable()
class ManualService {}
```

---

## Injection Decorators

> **Note:** For new code, prefer [Injection Functions](/guide/injection) (`inject()`, `injectOptional()`, `injectLazy()`) — they offer cleaner syntax with field initializers.

### @Inject()

Explicitly specifies the injection token for a constructor parameter. Alternative to `inject()` function.

```typescript
import { Injectable, Inject, InjectionToken } from '@noneforge/ioc';

const LOGGER = new InjectionToken<Logger>('LOGGER');
const CONFIG = new InjectionToken<Config>('CONFIG');

@Injectable()
class UserService {
  constructor(
    @Inject(LOGGER) private logger: Logger,
    @Inject(CONFIG) private config: Config
  ) {}
}
```

### @Optional()

Marks a dependency as optional. Returns `null` if not registered. Alternative to `injectOptional()`.

```typescript
import { Injectable, Inject, Optional, InjectionToken } from '@noneforge/ioc';

const CACHE = new InjectionToken<CacheService>('CACHE');

@Injectable()
class DataService {
  constructor(
    @Inject(CACHE) @Optional() private cache: CacheService | null
  ) {}
}
```

### @Lazy()

Defers dependency resolution until first access. Alternative to `injectLazy()`.

```typescript
import { Injectable, Inject, Lazy, InjectionToken } from '@noneforge/ioc';

const HEAVY_SERVICE = new InjectionToken<HeavyService>('HEAVY');

@Injectable()
class AppService {
  constructor(
    @Inject(HEAVY_SERVICE) @Lazy() private heavyService: HeavyService
  ) {}

  doWork() {
    // Resolved only when accessed
    this.heavyService.process();
  }
}
```

---

## AOP Decorators

Aspect-Oriented Programming decorators for cross-cutting concerns. Applied to methods.

### @Cached()

Caches method return values:

```typescript
import { Injectable, Cached } from '@noneforge/ioc';

@Injectable()
class DataService {
  @Cached()
  getExpensiveData(): Data {
    // Called only once, result is cached
    return computeExpensiveData();
  }

  @Cached(60000) // TTL in milliseconds
  getDataWithExpiration(): Data {
    // Cached for 60 seconds
    return fetchData();
  }
}
```

### @Log()

Logs method calls and results. Optionally accepts a tag prefix for filtering logs:

```typescript
import { Injectable, Log } from '@noneforge/ioc';

@Injectable()
class UserService {
  @Log()
  createUser(name: string): User {
    // Logs: "createUser called with: ['John']"
    // Logs: "createUser returned: {id: 1, name: 'John'}"
    return { id: 1, name };
  }

  @Log('[Auth]')
  login(email: string): Token {
    // Logs: "[Auth] login called with: ['user@example.com']"
    // Logs: "[Auth] login returned: {token: '...'}"
    return { token: 'abc123' };
  }
}
```

### @Transactional()

Marks a method as transactional (for use with transaction middleware):

```typescript
import { Injectable, Transactional } from '@noneforge/ioc';

@Injectable()
class OrderService {
  @Transactional()
  createOrder(items: Item[]): Order {
    // Method runs within transaction context
    return this.processOrder(items);
  }
}
```

---

## Comparison: inject() vs Decorators

| Feature | inject() | Decorators |
|---------|----------|------------|
| Syntax | Field initializer | Constructor parameter |
| Optional deps | `injectOptional()` | `@Optional()` |
| Lazy deps | `injectLazy()` | `@Lazy()` |
| Multi deps | `injectAll()` | Not available |
| Tree-shaking | Better | Standard |
| Private fields | Works | Works |

### Example Comparison

```typescript
// Using inject() - Recommended
@Injectable()
class ModernService {
  private logger = inject(LOGGER);
  private config = inject(CONFIG);
  private cache = injectOptional(CACHE);

  doWork() {
    this.logger.log('Working...');
  }
}

// Using decorators - Alternative
@Injectable()
class TraditionalService {
  constructor(
    @Inject(LOGGER) private logger: Logger,
    @Inject(CONFIG) private config: Config,
    @Inject(CACHE) @Optional() private cache: CacheService | null
  ) {}

  doWork() {
    this.logger.log('Working...');
  }
}
```

## Best Practices

1. **Use `inject()` for new code** - Modern, cleaner syntax
2. **Use `@Injectable()` on all injectable classes** - Required for DI
3. **Use `InjectionToken` for non-class values** - Type safety
4. **Use `injectOptional()` for optional dependencies** - Avoid runtime errors
5. **Use `injectLazy()` for expensive dependencies** - Defer initialization
6. **Use AOP decorators sparingly** - Only for true cross-cutting concerns

## Next Steps

- [Scopes](/guide/scopes) - Managing instance lifecycles
- [Modules](/guide/modules) - Organizing providers
- [Interceptors](/guide/interceptors) - Request interception
