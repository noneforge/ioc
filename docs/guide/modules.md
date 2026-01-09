# Modules

Modules organize related providers into cohesive units. They enable better code organization, encapsulation, and reusability.

## @Module Decorator

The `@Module` decorator defines a module with its providers, imports, and exports.

```typescript
import { Module, Injectable, inject, InjectionToken } from '@noneforge/ioc';

const DB_URL = new InjectionToken<string>('DB_URL');

@Injectable()
class UserRepository {
  private dbUrl = inject(DB_URL);

  findAll() {
    return [`Connecting to ${this.dbUrl}...`];
  }
}

@Injectable()
class UserService {
  private repo = inject(UserRepository);

  getUsers() {
    return this.repo.findAll();
  }
}

@Module({
  providers: [
    { provide: DB_URL, useValue: 'postgres://localhost/users' },
    UserRepository,
    UserService,
  ],
  exports: [UserService], // What other modules can access
})
class UserModule {}
```

## Module Options

```typescript
interface ModuleOptions {
  // Other modules to import
  imports?: Constructor[];

  // Providers defined in this module
  providers?: Provider[];

  // Tokens/classes that other modules can access
  exports?: (Token | Constructor)[];
}
```

## Loading Modules

### Using Container

```typescript
const container = new Container();
container.loadModule(UserModule);

const userService = container.get(UserService);
```

### Using Bootstrap

```typescript
import { bootstrap } from '@noneforge/ioc';

@Module({
  imports: [UserModule, OrderModule],
})
class AppModule {}

const { app, container } = await bootstrap(AppModule);
```

### Using createApplication

```typescript
import { createApplication } from '@noneforge/ioc';

const container = createApplication(AppModule, {
  providers: [
    // Additional root providers
  ],
});
```

## Module Imports

Import other modules to access their exported providers:

```typescript
@Module({
  providers: [{ provide: CACHE_TTL, useValue: 3600 }],
  exports: [CACHE_TTL],
})
class CacheModule {}

@Module({
  providers: [CacheService],
  exports: [CacheService],
})
class CacheServiceModule {}

@Module({
  imports: [CacheModule, CacheServiceModule],
  providers: [UserService],
})
class UserModule {}
// UserService can inject CACHE_TTL and CacheService
```

## Module Exports

Only exported providers are accessible to importing modules:

```typescript
@Module({
  providers: [
    InternalHelper,    // Not exported - private to module
    PublicService,     // Will be exported
  ],
  exports: [PublicService],
})
class FeatureModule {}

@Module({
  imports: [FeatureModule],
  providers: [AppService],
})
class AppModule {}

// Works - PublicService is exported
container.get(PublicService);

// Throws - InternalHelper is not exported
container.get(InternalHelper); // Error!
```

## Dynamic Modules

Create modules programmatically using `createDynamicModule`:

```typescript
import { createDynamicModule, InjectionToken } from '@noneforge/ioc';

const API_URL = new InjectionToken<string>('API_URL');

function createApiModule(apiUrl: string) {
  return createDynamicModule({
    module: class ApiModule {},
    providers: [
      { provide: API_URL, useValue: apiUrl },
      ApiService,
    ],
    exports: [ApiService, API_URL],
  });
}

// Create module with specific config
const ApiModule = createApiModule('https://api.example.com');

@Module({
  imports: [ApiModule],
})
class AppModule {}
```

## Configurable Modules

Create modules with `forRoot`/`forChild` pattern using `createConfigurableModule`:

```typescript
import { createConfigurableModule, InjectionToken } from '@noneforge/ioc';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
}

const DB_CONFIG = new InjectionToken<DatabaseConfig>('DB_CONFIG');

@Injectable()
class DatabaseService {
  private config = inject(DB_CONFIG);

  connect() {
    return `Connecting to ${this.config.host}:${this.config.port}/${this.config.database}`;
  }
}

const DatabaseModule = createConfigurableModule<DatabaseConfig>((config) => ({
  providers: [
    { provide: DB_CONFIG, useValue: config },
    DatabaseService,
  ],
  exports: [DatabaseService, DB_CONFIG],
}));

// Use forRoot for main configuration
@Module({
  imports: [
    DatabaseModule.forRoot({
      host: 'localhost',
      port: 5432,
      database: 'myapp',
    }),
  ],
})
class AppModule {}

// Use forChild for feature modules (partial config)
@Module({
  imports: [
    DatabaseModule.forChild({
      database: 'feature_db',
    }),
  ],
})
class FeatureModule {}
```

### forRoot vs forChild

| Method | Use Case | Config |
|--------|----------|--------|
| `forRoot()` | Root/main module | Full configuration |
| `forChild()` | Feature modules | Partial configuration |

## Real-World Example

### Authentication Module

```typescript
import { Module, Injectable, inject, InjectionToken, createConfigurableModule } from '@noneforge/ioc';

// Configuration
interface AuthConfig {
  jwtSecret: string;
  expiresIn: string;
}

const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG');

// Services
@Injectable()
class TokenService {
  private config = inject(AUTH_CONFIG);

  generateToken(payload: object): string {
    // Generate JWT using config
    return `token-${this.config.expiresIn}`;
  }

  verifyToken(token: string): boolean {
    return token.startsWith('token-');
  }
}

@Injectable()
class AuthService {
  private tokenService = inject(TokenService);

  login(credentials: { email: string; password: string }) {
    // Validate credentials...
    return {
      token: this.tokenService.generateToken({ email: credentials.email }),
    };
  }

  validateToken(token: string) {
    return this.tokenService.verifyToken(token);
  }
}

// Create configurable module
const AuthModule = createConfigurableModule<AuthConfig>((config) => ({
  providers: [
    { provide: AUTH_CONFIG, useValue: config },
    TokenService,
    AuthService,
  ],
  exports: [AuthService],
}));

// Usage
@Module({
  imports: [
    AuthModule.forRoot({
      jwtSecret: process.env.JWT_SECRET!,
      expiresIn: '24h',
    }),
  ],
})
class AppModule {}
```

### Feature Modules

```typescript
// users/user.module.ts
@Module({
  providers: [UserRepository, UserService],
  exports: [UserService],
})
class UserModule {}

// orders/order.module.ts
@Module({
  imports: [UserModule], // Access UserService
  providers: [OrderRepository, OrderService],
  exports: [OrderService],
})
class OrderModule {}

// notifications/notification.module.ts
@Module({
  providers: [EmailService, PushService, NotificationService],
  exports: [NotificationService],
})
class NotificationModule {}

// app.module.ts
@Module({
  imports: [
    UserModule,
    OrderModule,
    NotificationModule,
  ],
})
class AppModule {}
```

## Module Loading Order

Modules are loaded in dependency order:

1. Imported modules are loaded first
2. Module's own providers are registered
3. Exports are validated

```typescript
@Module({
  imports: [A, B], // A and B loaded first
  providers: [C],   // Then C is registered
  exports: [C],     // C is made available
})
class MyModule {}
```

## Re-exporting Modules

Re-export imported modules:

```typescript
@Module({
  providers: [CoreService],
  exports: [CoreService],
})
class CoreModule {}

@Module({
  imports: [CoreModule],
  exports: [CoreModule], // Re-export entire module
})
class SharedModule {}

@Module({
  imports: [SharedModule],
  // Can now access CoreService through SharedModule
})
class AppModule {}
```

## Module Best Practices

1. **Single responsibility** - Each module should have one purpose
2. **Export only what's needed** - Keep internal services private
3. **Use forRoot/forChild for configurable modules** - Clear configuration pattern
4. **Avoid circular imports** - Structure modules hierarchically
5. **Group related providers** - Keep related services together

```
app/
├── core/
│   └── core.module.ts          # Singleton services
├── shared/
│   └── shared.module.ts        # Shared utilities
├── features/
│   ├── users/
│   │   └── user.module.ts
│   └── orders/
│       └── order.module.ts
└── app.module.ts               # Root module
```

## Runnable Example

See [examples/modules](https://github.com/noneforge/ioc/tree/main/examples/modules) for a complete runnable example demonstrating module patterns.

## Next Steps

- [Interceptors](/guide/interceptors) - Request interception
- [Testing](/guide/testing) - Testing modules
- [Provider Helpers](/guide/provider-helpers) - Dynamic provider patterns
