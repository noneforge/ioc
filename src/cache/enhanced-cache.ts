import { isDefined } from '../utils';

/**
 * Single cache entry with metadata for eviction policies and lifecycle management
 * @template T - The type of the cached value
 */
interface CacheEntry<T> {
  value: T;

  /**
   * Expiration timestamp in milliseconds (from Date.now()).
   * When defined, entry is automatically removed on access after expiration
   */
  expires?: number;

  /**
   * Timestamp of last access in milliseconds.
   * Updated on each `get()` call for LRU eviction policy
   */
  lastAccessed: number;

  /**
   * Access counter incremented on each `get()` call.
   * Used by LFU eviction policy to identify least frequently used entries
   */
  accessCount: number;

  /**
   * Cleanup function called when entry is removed.
   * Useful for releasing resources like database connections or file handles
   */
  dispose?: () => void | Promise<void>;
}

/** Options for configuring cache entry behavior */
export interface CacheSetOptions {
  /**
   * Time to live in milliseconds.
   * Entry is automatically removed after this duration via setTimeout
   */
  ttl?: number;

  /**
   * Cleanup function called when entry is removed.
   * Can be synchronous or asynchronous
   */
  dispose?: () => void | Promise<void>;
}

/**
 * Policy for evicting entries when cache reaches maximum size
 *
 * - `'lru'` - Least Recently Used: removes entries that haven't been accessed for the longest time
 * - `'lfu'` - Least Frequently Used: removes entries with the lowest access count
 * - `'fifo'` - First In First Out: removes the oldest inserted entries
 */
export type CacheEvictionPolicy = 'lru' | 'lfu' | 'fifo';

/** Cache performance and usage statistics */
export interface CacheStatistics {
  /** Current number of entries in the cache */
  size: number;
  /** Number of successful cache lookups */
  hits: number;
  /** Failed lookups due to missing key or expiration */
  misses: number;
  /** Entries removed when cache reached maxSize */
  evictions: number;
}

/**
 * Configuration options for creating an EnhancedCache instance
 *
 * @template K - The type of cache keys
 */
export interface CacheOptions<K> {
  /**
   * Maximum number of entries before eviction occurs
   * @default 1000
   */
  maxSize?: number;
  /**
   * Strategy for removing entries when cache reaches size limit
   * @default 'lru'
   */
  evictionPolicy?: CacheEvictionPolicy;
  /**
   * Callback invoked when a dispose function throws an error during
   * automatic cache operations (TTL expiration, eviction, or lazy deletion).
   *
   * Since these operations occur in synchronous contexts (get, has, set),
   * errors from async dispose functions cannot be propagated normally.
   * This callback allows you to handle such errors (e.g., logging, monitoring).
   *
   * @param error - The error thrown by the dispose function
   * @param key - The cache key whose dispose function failed
   */
  onDisposeError?: (error: unknown, key: K) => void;
}

/**
 * High-performance in-memory cache with automatic expiration, configurable eviction policies,
 * and statistics tracking. Supports TTL-based expiration, resource cleanup via dispose callbacks,
 * and multiple eviction strategies (LRU, LFU, FIFO)
 *
 * @template K - The type of cache keys
 * @template V - The type of cached values
 */
export class EnhancedCache<K, V> {
  private readonly storage = new Map<K, CacheEntry<V>>();
  private readonly timers = new Map<K, NodeJS.Timeout>();
  private readonly maxSize: number;
  private readonly evictionPolicy: CacheEvictionPolicy;
  private readonly onDisposeError: ((error: unknown, key: K) => void) | undefined;
  private stats: Omit<CacheStatistics, 'size'> = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options: CacheOptions<K> = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.evictionPolicy = options.evictionPolicy ?? 'lru';
    this.onDisposeError = options.onDisposeError;
  }

  /**
   * Stores a value in the cache with optional TTL and disposal callback.
   * If cache is at maximum capacity, evicts an entry according to the eviction policy
   */
  set(key: K, value: V, options?: CacheSetOptions): void {
    const { ttl, dispose } = options ?? {};

    if (this.storage.size >= this.maxSize && !this.storage.has(key)) {
      this.evict();
    }

    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const entry: CacheEntry<V> = {
      value,
      expires: isDefined(ttl) ? Date.now() + ttl : undefined,
      lastAccessed: Date.now(),
      accessCount: 0,
      dispose,
    };

    this.storage.set(key, entry);

    if (isDefined(ttl)) {
      const timer = setTimeout(() => {
        this.safeDelete(key);
      }, ttl);

      this.timers.set(key, timer);
    }
  }

  /**
   * Retrieves a value from the cache.
   * Updates access statistics and lazily removes expired entries
   */
  get(key: K): V | undefined {
    const entry = this.storage.get(key);
    if (!entry) {
      this.stats.misses += 1;

      return undefined;
    }

    if (isDefined(entry.expires) && Date.now() > entry.expires) {
      this.safeDelete(key);

      this.stats.misses += 1;

      return undefined;
    }

    entry.lastAccessed = Date.now();
    entry.accessCount += 1;
    this.stats.hits += 1;

    return entry.value;
  }

  /** Removes one entry according to the configured eviction policy */
  private evict(): void {
    let keyToEvict: K | undefined;

    switch (this.evictionPolicy) {
      case 'lru': {
        keyToEvict = this.getLRUKey();

        break;
      }

      case 'lfu': {
        keyToEvict = this.getLFUKey();

        break;
      }

      case 'fifo': {
        keyToEvict = this.storage.keys().next().value;

        break;
      }

      // no default
    }

    if (isDefined(keyToEvict)) {
      this.safeDelete(keyToEvict);

      this.stats.evictions += 1;
    }
  }

  /** Finds the least recently used cache key */
  private getLRUKey(): K | undefined {
    let oldest: K | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.storage) {
      if (entry.lastAccessed < oldestTime) {
        oldest = key;
        oldestTime = entry.lastAccessed;
      }
    }

    return oldest;
  }

  /** Finds the least frequently used cache key */
  private getLFUKey(): K | undefined {
    let leastUsed: K | undefined;
    let minCount = Infinity;

    for (const [key, entry] of this.storage) {
      if (entry.accessCount < minCount) {
        leastUsed = key;
        minCount = entry.accessCount;
      }
    }

    return leastUsed;
  }

  /** Deletes an entry and catches dispose errors, forwarding them to the error handler */
  private safeDelete(key: K): void {
    this.delete(key).catch((error: unknown) => {
      this.onDisposeError?.(error, key);
    });
  }

  /** Removes an entry from cache and calls its dispose function if present */
  async delete(key: K): Promise<void> {
    const entry = this.storage.get(key);
    if (entry?.dispose) {
      await entry.dispose();
    }

    this.storage.delete(key);

    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /** Removes all entries from the cache and resets statistics */
  async clear(): Promise<void> {
    for (const key of this.storage.keys()) {
      await this.delete(key);
    }

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Checks if a key exists in the cache and is not expired.
   * Lazily removes expired entries
   */
  has(key: K): boolean {
    const entry = this.storage.get(key);
    if (!entry) {
      return false;
    }

    if (isDefined(entry.expires) && Date.now() > entry.expires) {
      this.safeDelete(key);

      return false;
    }

    return true;
  }

  /** Gets the current number of entries in the cache */
  get size(): number {
    return this.storage.size;
  }

  /** Returns cache statistics including size, hits, misses, and evictions */
  getStatistics(): CacheStatistics {
    return {
      size: this.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
    };
  }
}
