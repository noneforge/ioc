# Injection Functions

Modern API for dependency injection using `inject()` and related functions.

These functions are the **recommended alternative** to injection decorators (`@Inject`, `@Optional`, `@Lazy`):

| Function | Replaces | Advantage |
|----------|----------|-----------|
| `inject()` | `@Inject()` | Field initializers, cleaner syntax |
| `injectOptional()` | `@Optional()` | No decorator stacking |
| `injectLazy()` | `@Lazy()` | More explicit API |
| `injectAll()` | — | No decorator equivalent |

> **Note:** You still need `@Injectable()` decorator on your classes. These functions replace only the injection decorators.

## inject()

Resolve dependency synchronously:

```typescript
import { inject, Injectable, InjectionToken } from '@noneforge/ioc';

const CONFIG = new InjectionToken<Config>('CONFIG');

@Injectable()
class MyService {
  private config = inject(CONFIG);

  // With options
  private optionalDep = inject(OTHER_TOKEN, { optional: true });
}
```

### InjectOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `optional` | `boolean` | `false` | Return null instead of throwing |
| `skipSelf` | `boolean` | `false` | Skip current container, resolve from parent |
| `self` | `boolean` | `false` | Only resolve from current container |
| `lazy` | `boolean` | `false` | Create lazy proxy |
| `multi` | `boolean` | `false` | Resolve all multi-providers as array |

## injectLazy()

Defer resolution until first access:

```typescript
import { injectLazy, Injectable } from '@noneforge/ioc';

@Injectable()
class MyService {
  private heavyService = injectLazy(HeavyService);

  doWork() {
    // Resolved only when accessed
    this.heavyService.process();
  }
}
```

## injectAll()

Get all multi-providers:

```typescript
import { injectAll, Injectable, InjectionToken } from '@noneforge/ioc';

const PLUGIN = new InjectionToken<Plugin>('PLUGIN');

@Injectable()
class PluginManager {
  private plugins = injectAll(PLUGIN);

  runAll() {
    for (const plugin of this.plugins) {
      plugin.execute();
    }
  }
}
```

## injectOptional()

Return null if not found:

```typescript
import { injectOptional, Injectable, InjectionToken } from '@noneforge/ioc';

const CACHE = new InjectionToken<CacheService>('CACHE');

@Injectable()
class DataService {
  private cache = injectOptional(CACHE);

  getData() {
    if (this.cache) {
      return this.cache.get('data');
    }
    
    return fetchData();
  }
}
```

## Forward References

Resolve circular dependencies using `forwardRef`:

```typescript
import { Injectable, inject, forwardRef } from '@noneforge/ioc';

// Two services that depend on each other
@Injectable()
class ServiceA {
  // Use forwardRef to defer resolution
  private serviceB = inject(forwardRef(() => ServiceB));

  doA() {
    console.log('A calling B');
    this.serviceB.doB();
  }
}

@Injectable()
class ServiceB {
  private serviceA = inject(forwardRef(() => ServiceA));

  doB() {
    console.log('B');
  }

  callA() {
    this.serviceA.doA();
  }
}
```

### Forward Ref Utilities

```typescript
import { forwardRef, resolveForwardRef, isForwardRef } from '@noneforge/ioc';

// Create forward reference
const ref = forwardRef(() => MyService);

// Check if something is a forward ref
if (isForwardRef(ref)) {
  // Resolve it
  const token = resolveForwardRef(ref);
  console.log(token === MyService); // true
}
```

## Comparison

| Function | Use Case | Returns |
|----------|----------|---------|
| `inject()` | Standard injection | `T` |
| `injectLazy()` | Deferred loading | `T` (proxy) |
| `injectAll()` | Multi-providers | `T[]` |
| `injectOptional()` | Optional deps | `T \| null` |

## Best Practices

1. **Prefer `inject()` over constructor injection** - Cleaner syntax, works with class fields
2. **Use `injectLazy()` for heavy dependencies** - Improves startup time
3. **Use `injectOptional()` for optional features** - Graceful degradation
4. **Use `forwardRef` sparingly** - Frequent use indicates design issues

## Next Steps

- [Decorators](/guide/decorators) - @Inject, @Optional decorators
- [Providers](/guide/providers) - Provider configuration
- [Dependency Graph](/guide/dependency-graph) - Cycle detection