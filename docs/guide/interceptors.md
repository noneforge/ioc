# Interceptors

Interceptors allow you to intercept and modify the dependency resolution process. They can be used for caching, logging, validation, retry logic, and more.

## Two Styles of Interceptors

You can define interceptors in two ways: **class-based** (traditional) or **functional** (modern, like Angular 15+).

### Class-based Interceptor

```typescript
import type { Interceptor, InjectionContext } from '@noneforge/ioc';

class LoggingInterceptor implements Interceptor {
  intercept<T>(context: InjectionContext, next: () => T): T {
    console.log(`Resolving: ${String(context.token)}`);
    
    return next();
  }
}

// Usage
container.addProvider({
  provide: SERVICE,
  useClass: MyService,
  interceptors: [new LoggingInterceptor()],
});
```

### Functional Interceptor

```typescript
import type { InterceptorFn } from '@noneforge/ioc';

const loggingInterceptor: InterceptorFn = (context, next) => {
  console.log(`Resolving: ${String(context.token)}`);
  
  return next();
};

// Usage
container.addProvider({
  provide: SERVICE,
  useClass: MyService,
  interceptors: [loggingInterceptor],
});
```

### Mixing Both Styles

You can freely mix class-based and functional interceptors:

```typescript
container.addProvider({
  provide: SERVICE,
  useClass: MyService,
  interceptors: [
    new CachingInterceptor(),              // class
    loggingInterceptor,                    // function variable
    (ctx, next) => {                       // inline function
      console.log('Resolving:', ctx.token);
      
      return next();
    },
  ],
});
```

## Interceptor Interface

```typescript
// Class-based (with generics for type safety)
interface Interceptor {
  intercept<T>(
    context: InjectionContext,
    next: () => T | Promise<T>
  ): T | Promise<T>;
}

// Functional (simpler, uses unknown)
type InterceptorFn = (
  context: InjectionContext,
  next: () => unknown
) => unknown;

// Union type (accepts both)
type InterceptorLike = Interceptor | InterceptorFn;
```

The intercept method/function receives:
- `context` - Information about the current resolution (token, container, metadata)
- `next` - Function to call the next interceptor or resolve the dependency

## Built-in Interceptors

### CachingInterceptor

Caches resolved instances with optional TTL (Time To Live):

```typescript
import { Container, CachingInterceptor, InjectionToken } from '@noneforge/ioc';

const EXPENSIVE_SERVICE = new InjectionToken<ExpensiveService>('EXPENSIVE');

const container = new Container();

container.addProvider({
  provide: EXPENSIVE_SERVICE,
  useFactory: () => {
    console.log('Creating expensive service...');
    
    return new ExpensiveService();
  },
  interceptors: [new CachingInterceptor()], // Default: no expiration
});

// First call creates the instance
const service1 = container.get(EXPENSIVE_SERVICE);
// "Creating expensive service..."

// Second call uses cached instance
const service2 = container.get(EXPENSIVE_SERVICE);
// No log - cached!

console.log(service1 === service2); // true
```

#### With TTL

```typescript
container.addProvider({
  provide: EXPENSIVE_SERVICE,
  useFactory: () => new ExpensiveService(),
  interceptors: [
    new CachingInterceptor(60000), // Cache for 60 seconds
  ],
});
```

### LoggingInterceptor

Logs resolution events with timing information:

```typescript
import { Container, LoggingInterceptor, InjectionToken } from '@noneforge/ioc';

// Default logger (console)
const loggingInterceptor = new LoggingInterceptor();

// Custom logger
interface Logger {
  debug?(message: string, ...args: unknown[]): void;
  error?(message: string, error?: Error): void;
}

const customLogger: Logger = {
  debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
};

const customLoggingInterceptor = new LoggingInterceptor(customLogger);

container.addProvider({
  provide: UserService,
  useClass: UserService,
  interceptors: [new LoggingInterceptor()],
});

container.get(UserService);
// Logs:
// Resolving: UserService
// Resolved UserService in 2ms
```

### RetryInterceptor

Automatically retries failed resolutions with exponential backoff:

```typescript
import { Container, RetryInterceptor, InjectionToken } from '@noneforge/ioc';

const REMOTE_CONFIG = new InjectionToken<RemoteConfig>('REMOTE_CONFIG');

container.addProvider({
  provide: REMOTE_CONFIG,
  useAsync: async () => {
    const response = await fetch('https://config.example.com');
    if (!response.ok) {
      throw new Error('Failed to fetch config');
    }
    
    return response.json();
  },
  interceptors: [
    new RetryInterceptor(3, 1000), // 3 retries, 1 second initial delay
  ],
});

// Will retry up to 3 times with exponential backoff
const config = await container.getAsync(REMOTE_CONFIG);
```

#### Retry Parameters

```typescript
new RetryInterceptor(
  maxRetries,  // Maximum number of retries (default: 3)
  delay        // Initial delay in ms (default: 1000)
);
// Delay doubles after each retry (exponential backoff)
// 1s -> 2s -> 4s -> ...
```

### ValidationInterceptor

Validates resolved values against a custom validator:

```typescript
import { Container, ValidationInterceptor, InjectionToken } from '@noneforge/ioc';

interface User {
  id: number;
  email: string;
}

const USER = new InjectionToken<User>('USER');

container.addProvider({
  provide: USER,
  useValue: { id: 1, email: 'test@example.com' },
  interceptors: [
    new ValidationInterceptor(
      (value) => {
        const user = value as User;
        
        return user.id > 0 && user.email.includes('@');
      },
      'User must have valid id and email'
    ),
  ],
});

container.get(USER); // Works

// Invalid value throws ValidationError
container.addProvider({
  provide: USER,
  useValue: { id: -1, email: 'invalid' },
  interceptors: [
    new ValidationInterceptor(
      (value) => (value as User).id > 0,
      'User id must be positive'
    ),
  ],
});

container.get(USER); // Throws ValidationError!
```

## Creating Custom Interceptors

### Basic Custom Interceptor

```typescript
import type { Interceptor, InjectionContext } from '@noneforge/ioc';

class TimingInterceptor implements Interceptor {
  intercept<T>(context: InjectionContext, next: () => T): T {
    const start = performance.now();
    const result = next();
    const duration = performance.now() - start;

    console.log(`Resolved ${String(context.token)} in ${duration.toFixed(2)}ms`);

    return result;
  }
}
```

### Async Custom Interceptor

```typescript
class AsyncTimingInterceptor implements Interceptor {
  async intercept<T>(
    context: InjectionContext,
    next: () => T | Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const result = await next();
    const duration = performance.now() - start;

    console.log(`Resolved ${String(context.token)} in ${duration.toFixed(2)}ms`);

    return result;
  }
}
```

### Conditional Interceptor

```typescript
class DebugInterceptor implements Interceptor {
  constructor(private debug: boolean) {}

  intercept<T>(context: InjectionContext, next: () => T): T {
    if (this.debug) {
      console.log(`Resolving: ${String(context.token)}`);
      console.log(`Depth: ${context.depth}`);
      console.log(`Path: ${context.path.map(String).join(' -> ')}`);
    }

    return next();
  }
}
```

### Result-Modifying Interceptor

```typescript
class WrappingInterceptor implements Interceptor {
  intercept<T>(context: InjectionContext, next: () => T): T {
    const result = next();

    // Wrap the result
    if (typeof result === 'object' && result !== null) {
      return new Proxy(result as object, {
        get(target, prop) {
          console.log(`Accessing ${String(prop)}`);
          
          return Reflect.get(target, prop);
        },
      }) as T;
    }

    return result;
  }
}
```

### Error-Handling Interceptor

```typescript
class FallbackInterceptor<T> implements Interceptor {
  constructor(private fallback: T) {}

  intercept<U>(context: InjectionContext, next: () => U): U {
    try {
      return next();
    } catch (error) {
      console.warn(`Failed to resolve ${String(context.token)}, using fallback`);
      
      return this.fallback as unknown as U;
    }
  }
}
```

## Using inject() in Functional Interceptors

Functional interceptors run within an injection context, so you can use `inject()` to resolve dependencies:

```typescript
import { inject, type InterceptorFn } from '@noneforge/ioc';

const authInterceptor: InterceptorFn = (context, next) => {
  // inject() works because we're in an injection context
  const authService = inject(AuthService);

  if (!authService.isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  return next();
};

const loggingInterceptor: InterceptorFn = (context, next) => {
  const logger = inject(Logger);
  logger.debug(`Resolving: ${String(context.token)}`);
  
  return next();
};
```

This is similar to how Angular's functional interceptors work with `inject()`.

## Helper Functions

Helper functions make it easier to create common interceptor patterns.

### createInterceptor

Create an interceptor from pre/post hooks:

```typescript
import { createInterceptor } from '@noneforge/ioc';

const timingInterceptor = createInterceptor({
  pre: (context) => {
    context.metadata.set('startTime', Date.now());
  },
  post: (context, result) => {
    const duration = Date.now() - (context.metadata.get('startTime') as number);
    console.log(`Resolution took ${duration}ms`);
    
    return result;
  },
});

// Only pre hook
const preOnlyInterceptor = createInterceptor({
  pre: (context) => console.log('Before resolution'),
});

// Only post hook
const transformInterceptor = createInterceptor({
  post: (context, result: string) => result.toUpperCase(),
});
```

### composeInterceptors

Combine multiple interceptors into one:

```typescript
import { composeInterceptors, LoggingInterceptor, CachingInterceptor } from '@noneforge/ioc';

const combined = composeInterceptors(
  new LoggingInterceptor(),
  new CachingInterceptor(),
  (ctx, next) => {
    console.log('Custom logic');
    
    return next();
  },
);

// Use as single interceptor
container.addProvider({
  provide: SERVICE,
  useClass: MyService,
  interceptors: [combined],
});
```

### when

Create a conditional interceptor that only runs when predicate returns true:

```typescript
import { when } from '@noneforge/ioc';

// Only log in debug mode
const debugInterceptor = when(
  (ctx) => ctx.metadata.get('debug') === true,
  (ctx, next) => {
    console.log('Debug:', ctx.token);
    
    return next();
  },
);

// Only intercept specific tokens
const specificTokenInterceptor = when(
  (ctx) => ctx.token === UserService,
  (ctx, next) => {
    console.log('Intercepting UserService');
    return next();
  },
);

// Combine with class interceptors
const conditionalCache = when(
  (ctx) => ctx.metadata.get('useCache') !== false,
  new CachingInterceptor(),
);
```

## Using Interceptors

### Provider-Level Interceptors

Apply interceptors to specific providers:

```typescript
container.addProvider({
  provide: UserService,
  useClass: UserService,
  interceptors: [
    new LoggingInterceptor(),
    new CachingInterceptor(60000),
  ],
});
```

### Multiple Interceptors

Interceptors are executed in order:

```typescript
container.addProvider({
  provide: SERVICE,
  useClass: Service,
  interceptors: [
    new LoggingInterceptor(),    // 1st: logs start
    new CachingInterceptor(),    // 2nd: checks cache
    new ValidationInterceptor(), // 3rd: validates result
  ],
});

// Execution order:
// 1. LoggingInterceptor.intercept() -> calls next()
// 2.   CachingInterceptor.intercept() -> calls next()
// 3.     ValidationInterceptor.intercept() -> calls next()
// 4.       Actual resolution
// 3.     ValidationInterceptor validates result
// 2.   CachingInterceptor caches result
// 1. LoggingInterceptor logs completion
```

## InjectionContext

The context object provides information about the current resolution:

```typescript
interface InjectionContext {
  // The container performing resolution
  container: ContainerLike;

  // The token being resolved
  token?: Token;

  // Request ID for request-scoped services
  requestId?: string | symbol;

  // Custom metadata
  metadata: Map<string, unknown>;

  // Resolution depth (for nested dependencies)
  depth: number;

  // Resolution path (for cycle detection)
  path: Token[];

  // Resolution strategy
  strategy: ResolutionStrategy;
}
```

### Using Context in Interceptors

```typescript
class ContextAwareInterceptor implements Interceptor {
  intercept<T>(context: InjectionContext, next: () => T): T {
    // Check resolution depth
    if (context.depth > 10) {
      console.warn('Deep dependency tree detected');
    }

    // Check for specific tokens
    if (context.token === SensitiveService) {
      console.log('Accessing sensitive service');
    }

    // Access custom metadata
    const userId = context.metadata.get('userId');
    if (userId) {
      console.log(`Resolution for user: ${userId}`);
    }

    return next();
  }
}
```

## InterceptorChain

For advanced use cases, you can use `InterceptorChain` directly:

```typescript
import { InterceptorChain } from '@noneforge/ioc';

const chain = new InterceptorChain();
chain.add(new LoggingInterceptor());
chain.add(new CachingInterceptor());

// Synchronous execution
const result = chain.execute(context, () => createInstance());

// Asynchronous execution
const asyncResult = await chain.executeAsync(context, async () => {
  return await createInstanceAsync();
});
```

## Best Practices

1. **Keep interceptors focused** - Each interceptor should do one thing
2. **Order matters** - Put logging first, caching second, validation last
3. **Handle errors gracefully** - Don't let interceptor errors crash the app
4. **Use async when needed** - Return promises for async operations
5. **Avoid side effects** - Interceptors should be predictable

### Common Interceptor Patterns

```typescript
// Logging + Caching + Validation
const standardInterceptors = [
  new LoggingInterceptor(logger),
  new CachingInterceptor(TTL),
  new ValidationInterceptor(validator),
];

// Retry + Logging for external services
const externalServiceInterceptors = [
  new RetryInterceptor(3, 1000),
  new LoggingInterceptor(logger),
];

// Debug mode
const debugInterceptors = process.env.DEBUG
  ? [new LoggingInterceptor(), new TimingInterceptor()]
  : [];
```

## Runnable Example

See [examples/interceptors](https://github.com/noneforge/ioc/tree/main/examples/interceptors) for a complete runnable example demonstrating all interceptor patterns.

## Next Steps

- [Plugin System](/guide/plugins) - Extend container with plugins
- [Testing](/guide/testing) - Testing with interceptors
- [Middleware](/guide/middleware) - Container-level middleware
- [API Reference](/guide/api-reference) - Complete interceptor API
