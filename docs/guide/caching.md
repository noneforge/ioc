# Caching

The internal caching system used for singleton management and custom caching needs.

## EnhancedCache

A flexible cache implementation with multiple eviction strategies.

### Cache Strategies

```typescript
import { EnhancedCache } from '@noneforge/ioc';

// LRU - Least Recently Used (default)
const lruCache = new EnhancedCache<string, number>({ maxSize: 100, evictionPolicy: 'lru' });

// LFU - Least Frequently Used
const lfuCache = new EnhancedCache<string, number>({ maxSize: 100, evictionPolicy: 'lfu' });

// FIFO - First In First Out
const fifoCache = new EnhancedCache<string, number>({ maxSize: 100, evictionPolicy: 'fifo' });
```

| Strategy | Best For | Eviction Logic |
|----------|----------|----------------|
| **LRU** | General use, web apps | Evicts items not accessed recently |
| **LFU** | Stable access patterns | Evicts items accessed least often |
| **FIFO** | Time-based data | Evicts oldest items first |

### Cache Operations

```typescript
const cache = new EnhancedCache<string, object>({ maxSize: 1000, evictionPolicy: 'lru' });

// Set with optional TTL and dispose callback
cache.set('key', { data: 'value' }, {
  ttl: 60000,
  dispose: async () => {
    console.log('Key was evicted!');
  },
});

// Get value
const value = cache.get('key'); // { data: 'value' } | undefined

// Check existence
if (cache.has('key')) {
  // ...
}

// Delete
cache.delete('key');

// Clear all (calls eviction callbacks)
await cache.clear();
```

### TTL (Time To Live)

```typescript
// Item expires after 60 seconds
cache.set('session', userData, { ttl: 60000 });

// No TTL - lives until evicted or cleared
cache.set('permanent', data);
```

### Eviction Callbacks

```typescript
// Called when item is evicted (capacity, TTL, or manual delete)
cache.set('connection', dbConnection, {
  dispose: async () => {
    await dbConnection.close();
    console.log('Connection closed on eviction');
  },
});
```

### Error Handling

When dispose callbacks throw errors during automatic operations (TTL expiration, eviction),
use `onDisposeError` to handle them:

```typescript
const cache = new EnhancedCache<string, Connection>({
  maxSize: 100,
  evictionPolicy: 'lru',
  onDisposeError: (error, key) => {
    console.error(`Failed to dispose ${String(key)}:`, error);
    // Log to monitoring service, etc.
  },
});
```

> **Note:** `onDisposeError` is only called for automatic operations (eviction, TTL expiration).
> Direct calls to `delete()` will propagate errors normally via the returned Promise.

### Cache Statistics

```typescript
const statistics = cache.getStatistics();
console.log(statistics);
// {
//   size: 42,
//   hits: 150,
//   misses: 25,
//   evictions: 10
// }

// Calculate hit rate
const hitRate = statistics.hits / (statistics.hits + statistics.misses);
console.log(`Cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
```

## Container Cache Configuration

Configure the container's internal singleton cache:

```typescript
const container = new Container([], undefined, {
  maxCacheSize: 500,  // Maximum cached singletons (default: 1000)
});
```

## CachingInterceptor

Add caching to any service resolution:

```typescript
import { Container, CachingInterceptor } from '@noneforge/ioc';

const container = new Container();

// Cache service instances for 5 minutes
container.addProvider({
  provide: ExpensiveService,
  useClass: ExpensiveService,
  interceptors: [
    new CachingInterceptor({ ttl: 300000 }),
  ],
});
```

### Custom Cache Key

```typescript
new CachingInterceptor({
  ttl: 60000,
  keyGenerator: (context) => {
    // Custom key based on metadata
    const tenant = context.metadata.get('tenant');
     
    return `${String(context.token)}-${tenant}`;
  },
});
```

## Use Cases

### 1. Configuration Cache

```typescript
const configCache = new EnhancedCache<string, Config>({ maxSize: 100, evictionPolicy: 'lru' });

async function getConfig(key: string): Promise<Config> {
  let config = configCache.get(key);
  if (!config) {
    config = await fetchConfig(key);
    configCache.set(key, config, { ttl: 300000 }); // 5 min TTL
  }
   
  return config;
}
```

### 2. Request Deduplication

```typescript
const pendingRequests = new EnhancedCache<string, Promise<Response>>({ maxSize: 50, evictionPolicy: 'lru' });

async function fetchOnce(url: string): Promise<Response> {
  let pending = pendingRequests.get(url);
  if (!pending) {
    pending = fetch(url);
    pendingRequests.set(url, pending, { ttl: 1000 }); // Short TTL
  }
   
  return pending;
}
```

### 3. Connection Pool

```typescript
const connectionPool = new EnhancedCache<string, Connection>({ maxSize: 10, evictionPolicy: 'lfu' });

function getConnection(host: string): Connection {
  let conn = connectionPool.get(host);
  if (!conn) {
    conn = createConnection(host);
    connectionPool.set(host, conn, {
      dispose: async () => {
        // Close on eviction
        await conn.close();
      },
    });
  }
   
  return conn;
}
```

## Best Practices

1. **Choose the right strategy**
   - LRU for most web applications
   - LFU for stable, predictable access patterns
   - FIFO for time-series or log data

2. **Set appropriate TTLs** - Balance freshness vs performance

3. **Monitor statistics** - Track hit rates to optimize cache size

4. **Use eviction callbacks** - Clean up resources properly

5. **Size caches appropriately** - Too small = thrashing, too large = memory waste

## Next Steps

- [Interceptors](/guide/interceptors) - CachingInterceptor details
- [Middleware](/guide/middleware) - Container-level middleware
- [API Reference](/guide/api-reference) - Complete cache API