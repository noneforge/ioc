# Examples

Runnable examples demonstrating @noneforge/ioc features. Each example is a standalone TypeScript file you can run locally.

## Running Examples

```bash
# Clone the repository
git clone https://github.com/noneforge/ioc.git
cd ioc

# Install dependencies
npm install

# Run an example
npx tsx examples/basic/index.ts
```

---

## Basic Usage

**Covers:** `inject()`, `InjectionToken`, `injectOptional()`, conditional providers with `when`

A simple dependency injection setup showing:
- Creating injectable services with `@Injectable()`
- Using `inject()` for field-based dependency injection
- Type-safe configuration with `InjectionToken<T>`
- Optional dependencies that gracefully handle missing providers
- Conditional providers that activate based on metadata

[View source on GitHub](https://github.com/noneforge/ioc/tree/main/examples/basic)

---

## Interceptors

**Covers:** Class/functional interceptors, `CachingInterceptor`, `LoggingInterceptor`, `ValidationInterceptor`, `createInterceptor`, `composeInterceptors`, `when`

Comprehensive interceptor patterns including:
- Custom class-based interceptors implementing `Interceptor` interface
- Functional interceptors (`InterceptorFn`) for simpler syntax
- Built-in interceptors for caching, logging, and validation
- Using `inject()` inside functional interceptors
- Helper functions: `createInterceptor()`, `composeInterceptors()`, `when()`
- Combining multiple interceptors in a chain

[View source on GitHub](https://github.com/noneforge/ioc/tree/main/examples/interceptors)

---

## Modules

**Covers:** `@Module`, imports/exports, `createDynamicModule`, `createConfigurableModule`, `forRoot`/`forChild`

Module system patterns showing:
- Creating modules with `@Module` decorator
- Module composition with imports and exports
- Dynamic modules with `createDynamicModule()`
- Configurable modules with `forRoot()` and `forChild()` patterns
- Real-world example with database configuration

[View source on GitHub](https://github.com/noneforge/ioc/tree/main/examples/modules)

---

## Scopes

**Covers:** All 5 scopes (`singleton`, `transient`, `request`, `prototype`, `scoped`), `ScopeManager`

Complete scope demonstration including:
- **Singleton** - One instance shared across the container
- **Transient** - New instance for every resolution
- **Request** - One instance per request ID (HTTP request isolation)
- **Prototype** - New instances with shared prototype chain
- **Custom scopes** - Manual scope management with `ScopeManager`
- HTTP request simulation with multiple concurrent requests

[View source on GitHub](https://github.com/noneforge/ioc/tree/main/examples/scopes)

---

## Testing

**Covers:** `TestContainer`, `override()`, `mock()`, `spy()`, `snapshot()`/`restore()`, `createMockProvider`, `createSpyProvider`

Testing utilities and patterns:
- Using `TestContainer` for unit tests
- Overriding providers at runtime with `override()`
- Mocking dependencies with `mock()`
- Creating spies with `spy()` for call tracking
- Snapshot/restore for test isolation
- Helper functions: `createTestContainer()`, `createMockProvider()`, `createSpyProvider()`
- Integration test patterns with `beforeEach`/`afterEach`

[View source on GitHub](https://github.com/noneforge/ioc/tree/main/examples/testing)

---

## Dependency Graph

**Covers:** `DependencyGraph`, `detectCycles`, `getCycleAnalysis`, `getMissingDependencies`, `getResolutionOrder`, `visualize`, `container.validate()`

Dependency graph analysis patterns including:
- Getting the dependency graph from a container
- Detecting circular dependencies with Tarjan's algorithm
- Analyzing cycles with statistics (depth, total nodes, cycle nodes)
- Finding missing/unregistered dependencies
- Computing topological resolution order
- Visualizing the dependency graph as a string
- Validating containers before production

[View source on GitHub](https://github.com/noneforge/ioc/tree/main/examples/dependency-graph)

---

## Related Documentation

- [Getting Started](/guide/getting-started) - Quick introduction
- [Scopes](/guide/scopes) - Detailed scope documentation
- [Interceptors](/guide/interceptors) - Interceptor patterns
- [Testing](/guide/testing) - Testing strategies
