# Changelog

## [0.1.0] - 2026-01-09

### Added

Initial release of @noneforge/ioc - a TypeScript dependency injection container.

#### Core Features
- `Container` class with provider registration and resolution
- Support for singleton, transient, request, prototype, and scoped instances
- Child containers with parent resolution chain
- Async provider support with `getAsync()`

#### Provider Types
- `ClassProvider` - instantiate classes with automatic dependency injection
- `ValueProvider` - provide static values
- `FactoryProvider` - use factory functions for complex instantiation
- `ExistingProvider` - alias one token to another
- `AsyncProvider` - async initialization support

#### Decorators
- `@Injectable()` - mark classes as injectable with optional scope
- `@Inject(token)` - inject by token instead of type
- `@Optional()` - allow null if provider is missing
- `@Lazy()` - create proxy that resolves on first access

#### AOP Decorators
- `@Cached()` - method-level caching
- `@Log()` - automatic method logging
- `@Transactional()` - transaction boundary marker

#### Module System
- `@Module()` decorator for organizing providers
- `createDynamicModule()` for runtime configuration
- `createConfigurableModule()` for reusable module patterns
- Module imports and exports

#### Interceptors
- `InterceptorChain` for cross-cutting concerns
- Built-in interceptors: `LoggingInterceptor`, `CachingInterceptor`, `ValidationInterceptor`, `RetryInterceptor`
- `createInterceptor()` helper for custom interceptors
- `composeInterceptors()` for combining interceptors

#### Advanced Features
- `InjectionToken<T>` for type-safe tokens
- `forwardRef()` for circular dependency handling
- `DependencyGraph` for cycle detection (Tarjan's algorithm)
- Conditional providers with `when` callback
- Multi-providers with `multi: true`
- Provider tags and metadata

#### Bootstrap System
- `bootstrap()` function for application initialization
- `createApplication()` alternative API
- Graceful shutdown with SIGTERM/SIGINT handlers
- Dependency validation on startup

#### Testing Utilities
- `TestContainer` for isolated testing
- `createTestContainer()` factory
- `createMockProvider()` and `createSpyProvider()` helpers

#### Error Handling
- Typed error classes: `InjectionError`, `CircularDependencyError`, `NoProviderError`, `ValidationError`, `ScopeError`
- Detailed error messages with resolution path context
