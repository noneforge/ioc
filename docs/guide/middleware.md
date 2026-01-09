# Middleware

Extend container behavior with middleware that hooks into the resolution process.

## Middleware Interface

```typescript
interface Middleware {
  // Execution priority (lower = earlier)
  priority: number;

  // Called before resolution
  pre?(context: InjectionContext): void | Promise<void>;

  // Called after resolution, can modify instance
  post?<T>(context: InjectionContext, instance: T): T | Promise<T>;
}
```

## Creating Middleware

### Logging Middleware

```typescript
class LoggingMiddleware implements Middleware {
  priority = 100;

  pre(context: InjectionContext) {
    console.log(`Resolving: ${String(context.token)}`);
  }

  post<T>(context: InjectionContext, instance: T): T {
    console.log(`Resolved: ${String(context.token)}`);
    
    return instance;
  }
}
```

### Metrics Middleware

```typescript
class MetricsMiddleware implements Middleware {
  priority = 50; // Runs before LoggingMiddleware

  private metrics = new Map<string, number>();

  pre(context: InjectionContext) {
    const key = String(context.token);
    this.metrics.set(key, (this.metrics.get(key) ?? 0) + 1);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}
```

### Timing Middleware

```typescript
class TimingMiddleware implements Middleware {
  priority = 10;

  private timings = new Map<string, number[]>();

  pre(context: InjectionContext) {
    context.metadata.set('startTime', performance.now());
  }

  post<T>(context: InjectionContext, instance: T): T {
    const startTime = context.metadata.get('startTime') as number;
    const duration = performance.now() - startTime;

    const key = String(context.token);
    const times = this.timings.get(key) ?? [];
    times.push(duration);
    this.timings.set(key, times);

    return instance;
  }
}
```

## Registering Middleware

```typescript
const container = new Container();

// Add middleware
container.use(new LoggingMiddleware());
container.use(new MetricsMiddleware());
container.use(new TimingMiddleware());

// Middleware runs in priority order (lower first)
// TimingMiddleware (10) → MetricsMiddleware (50) → LoggingMiddleware (100)
```

## Priority

Lower priority values run first:

| Priority | Use Case |
|----------|----------|
| 0-20 | Timing, profiling |
| 20-50 | Metrics, tracking |
| 50-100 | Logging, debugging |
| 100+ | Validation, security |

## Modifying Instances

The `post` hook can modify or wrap the resolved instance:

```typescript
class ProxyMiddleware implements Middleware {
  priority = 200;

  post<T>(context: InjectionContext, instance: T): T {
    // Wrap with proxy for method tracking
    return new Proxy(instance as object, {
      get(target, prop) {
        console.log(`Accessing: ${String(prop)}`);
        
        return Reflect.get(target, prop);
      }
    }) as T;
  }
}
```

## Async Middleware

Both `pre` and `post` hooks support async operations:

```typescript
class AuthMiddleware implements Middleware {
  priority = 50;

  async pre(context: InjectionContext) {
    // Check auth before resolution
    const user = await getCurrentUser();
    context.metadata.set('user', user);
  }

  async post<T>(context: InjectionContext, instance: T): Promise<T> {
    // Inject user context after resolution
    if ('setUser' in (instance as object)) {
      const user = context.metadata.get('user');
      await (instance as any).setUser(user);
    }
    return instance;
  }
}
```

## Best Practices

1. **Keep middleware lightweight** - Avoid heavy operations in `pre`/`post`
2. **Use appropriate priorities** - Ensure correct execution order
3. **Handle errors gracefully** - Wrap in try/catch when needed
4. **Use metadata for passing data** - Share state between `pre` and `post`

## Next Steps

- [Interceptors](/guide/interceptors) - Provider-level interception
- [Plugins](/guide/plugins) - Plugin system
- [Dependency Graph](/guide/dependency-graph) - Container analysis