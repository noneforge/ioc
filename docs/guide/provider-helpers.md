# Provider Helpers

Utility functions for creating and configuring providers.

## createProvider()

Create a class provider with options:

```typescript
import { createProvider, InjectionToken } from '@noneforge/ioc';

const LOGGER = new InjectionToken<Logger>('LOGGER');

// Create class provider with options
const provider = createProvider(LOGGER, ConsoleLogger, {
  scope: 'singleton',
  lazy: false,
});

container.addProvider(provider);
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `scope` | `'singleton' \| 'transient' \| 'request'` | Instance scope |
| `lazy` | `boolean` | Defer instantiation |

## createAsyncProvider()

Create an async factory provider:

```typescript
import { createAsyncProvider, InjectionToken } from '@noneforge/ioc';

const CONFIG = new InjectionToken<Config>('CONFIG');

const provider = createAsyncProvider(CONFIG, async () => {
  const response = await fetch('/config');
  
  return response.json();
});

container.addProvider(provider);
const config = await container.getAsync(CONFIG);
```

### With Dependencies

```typescript
const provider = createAsyncProvider(
  DATABASE,
  async (config: Config) => {
    return await createConnection(config.dbUrl);
  },
  [CONFIG] // Inject CONFIG into factory
);
```

## provideIf()

Conditional provider based on runtime condition:

```typescript
import { provideIf } from '@noneforge/ioc';

const debugProvider = provideIf(
  process.env.DEBUG === 'true',
  { provide: DebugService, useClass: DebugService }
);

// Returns null if condition is false
if (debugProvider) {
  container.addProvider(debugProvider);
}
```

### Use Cases

```typescript
// Feature flags
const featureProvider = provideIf(
  features.newUI,
  { provide: UIService, useClass: NewUIService }
);

// Platform-specific
const platformProvider = provideIf(
  process.platform === 'win32',
  { provide: FileSystem, useClass: WindowsFS }
);
```

## provideForEnvironment()

Environment-specific provider:

```typescript
import { provideForEnvironment } from '@noneforge/ioc';

// Only added in production
const prodLogger = provideForEnvironment('production', {
  provide: LoggerService,
  useClass: CloudLogger,
});

// Only added in development
const devLogger = provideForEnvironment('development', {
  provide: LoggerService,
  useClass: ConsoleLogger,
});

// Add both - only matching one will be active
[prodLogger, devLogger]
  .filter(Boolean)
  .forEach(p => container.addProvider(p!));
```

### Supported Environments

- `'development'`
- `'production'`
- `'test'`
- Custom values matching `process.env.NODE_ENV`

## Combining Helpers

```typescript
import {
  createProvider,
  createAsyncProvider,
  provideIf,
  provideForEnvironment
} from '@noneforge/ioc';

// Production with async config
const providers = [
  // Always register
  createProvider(LOGGER, ConsoleLogger, { scope: 'singleton' }),

  // Only in production
  provideForEnvironment('production', {
    provide: METRICS,
    useClass: CloudMetrics,
  }),

  // Conditional feature
  provideIf(config.caching, {
    provide: CACHE,
    useClass: RedisCache,
  }),
].filter(Boolean);

providers.forEach(p => container.addProvider(p!));
```

## Best Practices

1. **Use `createProvider` for consistency** - Standardizes provider creation
2. **Use `provideIf` for feature flags** - Clean conditional registration
3. **Use `provideForEnvironment` for env-specific** - Separates dev/prod concerns
4. **Filter null providers** - Always filter before adding to container

## Next Steps

- [Providers](/guide/providers) - Provider types and configuration
- [Modules](/guide/modules) - Module-based provider registration
- [Bootstrap](/guide/bootstrap) - Application initialization