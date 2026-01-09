# Dependency Graph

Analyze and visualize dependency relationships in your container.

## Cycle Detection

Uses Tarjan's Strongly Connected Components algorithm to detect circular dependencies:

```typescript
const result = container.validate();

if (!result.valid) {
  for (const error of result.errors) {
    console.error(error);
    // "Circular dependency detected: A -> B -> C -> A"
  }
}
```

## Visualizing Dependencies

```typescript
// Get the dependency graph
const graph = container.getDependencyGraph();

// Detect cycles
const cycles = graph.detectCycles();
if (cycles.length > 0) {
  console.log('Cycles found:', cycles);
}

// Get cycle analysis
const analysis = graph.getCycleAnalysis();
console.log(analysis);
// { cycles: [...], depth: 3, totalNodes: 10, cycleNodes: 3 }

// Find missing dependencies
const missing = graph.getMissingDependencies();
console.log('Missing:', missing);

// Get resolution order (topological sort)
const order = graph.getResolutionOrder();
console.log('Resolution order:', order);

// Visualize as string
const visualization = graph.visualize();
console.log(visualization);
// Dependency Graph:
//   UserService [singleton] -> [UserRepository]
//   UserRepository [singleton] -> [DatabaseConnection]
//   DatabaseConnection [singleton] -> []
```

## Container Statistics

Track resolution performance:

```typescript
const stats = container.getStatistics();

console.log(stats);
// {
//   resolutions: 1500,  // Total get() calls
//   creates: 50,        // New instance creations
//   cacheHits: 1450,    // Cache hits (singleton reuse)
//   errors: 2           // Resolution errors
// }
```

### Calculating Metrics

```typescript
const stats = container.getStatistics();

// Cache hit rate
const hitRate = stats.cacheHits / stats.resolutions;
console.log(`Cache hit rate: ${(hitRate * 100).toFixed(1)}%`);

// Error rate
const errorRate = stats.errors / stats.resolutions;
console.log(`Error rate: ${(errorRate * 100).toFixed(2)}%`);
```

## Best Practices

1. **Validate before production** - Catch dependency issues early with `container.validate()`
2. **Monitor statistics** - Track cache hit rates to identify performance issues
3. **Visualize complex graphs** - Use `graph.visualize()` for debugging
4. **Check resolution order** - Ensure dependencies resolve in expected order

## Next Steps

- [Injection Functions](/guide/injection) - Modern inject() API
- [Testing](/guide/testing) - Testing dependency graphs
- [API Reference](/guide/api-reference) - Complete API documentation