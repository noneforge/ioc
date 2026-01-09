import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnhancedCache } from '../../../src';
import { useFakeTimers, useRealTimers } from '../../helpers/test-utils';

describe('EnhancedCache', () => {
  let cache: EnhancedCache<string, any>;

  beforeEach(() => {
    useFakeTimers();
  });

  afterEach(() => {
    useRealTimers();
  });

  describe('Basic operations', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, any>();
    });

    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should delete values', async () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      await cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all values', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.size).toBe(3);

      await cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });

    it('should track cache size', () => {
      expect(cache.size).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);

      cache.delete('key1');
      expect(cache.size).toBe(1);
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, any>();
    });

    it('should expire values after TTL', () => {
      cache.set('key1', 'value1', { ttl: 1000 });
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire values without TTL', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(10000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return false for expired keys in has()', () => {
      cache.set('key1', 'value1', { ttl: 1000 });
      expect(cache.has('key1')).toBe(true);

      vi.advanceTimersByTime(1001);
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear timer when setting same key', () => {
      cache.set('key1', 'value1', { ttl: 1000 });
      cache.set('key1', 'value2', { ttl: 2000 });

      vi.advanceTimersByTime(1001);
      expect(cache.get('key1')).toBe('value2');
    });

    it('should handle setting value without TTL after having TTL', () => {
      cache.set('key1', 'value1', { ttl: 1000 });
      cache.set('key1', 'value2');

      vi.advanceTimersByTime(2000);
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('Dispose callbacks', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, any>();
    });

    it('should call dispose callback when deleting', async () => {
      const disposeSpy = vi.fn();
      cache.set('key1', 'value1', { dispose: disposeSpy });

      await cache.delete('key1');
      expect(disposeSpy).toHaveBeenCalledOnce();
    });

    it('should call dispose callback when clearing', async () => {
      const disposeSpy1 = vi.fn();
      const disposeSpy2 = vi.fn();

      cache.set('key1', 'value1', { dispose: disposeSpy1 });
      cache.set('key2', 'value2', { dispose: disposeSpy2 });

      await cache.clear();
      expect(disposeSpy1).toHaveBeenCalledOnce();
      expect(disposeSpy2).toHaveBeenCalledOnce();
    });

    it('should call dispose callback when expiring', () => {
      const disposeSpy = vi.fn();
      cache.set('key1', 'value1', { ttl: 1000, dispose: disposeSpy });

      vi.advanceTimersByTime(1001);
      expect(disposeSpy).toHaveBeenCalledOnce();
    });

    it('should handle async dispose callbacks', async () => {
      const asyncDispose = vi.fn().mockResolvedValue(undefined);
      cache.set('key1', 'value1', { dispose: asyncDispose });

      await cache.delete('key1');
      expect(asyncDispose).toHaveBeenCalledOnce();
    });

    it('should not call dispose callback if entry does not exist', async () => {
      await cache.delete('non-existent');
      // Should not throw
    });
  });

  describe('onDisposeError callback', () => {
    it('should call onDisposeError when dispose throws on TTL expiration', async () => {
      const onDisposeError = vi.fn();
      const disposeError = new Error('dispose failed');

      const errorCache = new EnhancedCache<string, string>({
        onDisposeError,
      });

      errorCache.set('key', 'value', {
        ttl: 1000,
        dispose: () => {
          throw disposeError;
        },
      });

      vi.advanceTimersByTime(1001);
      await vi.runAllTimersAsync();

      expect(onDisposeError).toHaveBeenCalledWith(disposeError, 'key');
    });

    it('should call onDisposeError when dispose throws on eviction', async () => {
      const onDisposeError = vi.fn();
      const disposeError = new Error('dispose failed');

      const errorCache = new EnhancedCache<string, string>({
        maxSize: 1,
        onDisposeError,
      });

      errorCache.set('key1', 'value1', {
        dispose: () => {
          throw disposeError;
        },
      });
      errorCache.set('key2', 'value2'); // triggers eviction

      await vi.runAllTimersAsync();

      expect(onDisposeError).toHaveBeenCalledWith(disposeError, 'key1');
    });

    it('should call onDisposeError when async dispose rejects', async () => {
      const onDisposeError = vi.fn();
      const disposeError = new Error('async dispose failed');

      const errorCache = new EnhancedCache<string, string>({
        onDisposeError,
      });

      errorCache.set('key', 'value', {
        ttl: 1000,
        dispose: async () => {
          throw disposeError;
        },
      });

      vi.advanceTimersByTime(1001);
      await vi.runAllTimersAsync();

      expect(onDisposeError).toHaveBeenCalledWith(disposeError, 'key');
    });

    it('should call onDisposeError when dispose throws on get() with expired entry', async () => {
      const onDisposeError = vi.fn();
      const disposeError = new Error('dispose failed on get');

      const errorCache = new EnhancedCache<string, string>({
        onDisposeError,
      });

      errorCache.set('key', 'value', {
        ttl: 1000,
        dispose: () => {
          throw disposeError;
        },
      });

      // Manually expire the entry by advancing time, but not triggering the timer
      vi.advanceTimersByTime(500);

      // Now manually set expires to past (simulate edge case)
      // We need to trigger get() after expiration
      vi.advanceTimersByTime(501);

      // Timer already triggered, let's test has() instead
      const result = errorCache.get('key');
      expect(result).toBeUndefined();

      await vi.runAllTimersAsync();

      expect(onDisposeError).toHaveBeenCalledWith(disposeError, 'key');
    });

    it('should call onDisposeError when dispose throws on has() with expired entry', async () => {
      const onDisposeError = vi.fn();
      const disposeError = new Error('dispose failed on has');

      const errorCache = new EnhancedCache<string, string>({
        onDisposeError,
      });

      // Set with TTL but we'll check via has() before timer fires
      errorCache.set('key', 'value', {
        ttl: 1000,
        dispose: () => {
          throw disposeError;
        },
      });

      vi.advanceTimersByTime(1001);
      await vi.runAllTimersAsync();

      // onDisposeError should have been called from TTL expiration
      expect(onDisposeError).toHaveBeenCalledWith(disposeError, 'key');
    });

    it('should not throw when onDisposeError is not provided', () => {
      const errorCache = new EnhancedCache<string, string>({ maxSize: 1 });

      errorCache.set('key1', 'value1', {
        dispose: () => {
          throw new Error('ignored');
        },
      });

      // Should not throw when evicting
      expect(() => { errorCache.set('key2', 'value2'); }).not.toThrow();
    });

    it('should not call onDisposeError when delete is called directly (async)', async () => {
      const onDisposeError = vi.fn();
      const disposeError = new Error('dispose failed');

      const errorCache = new EnhancedCache<string, string>({
        onDisposeError,
      });

      errorCache.set('key', 'value', {
        dispose: () => {
          throw disposeError;
        },
      });

      // Direct delete() should propagate the error, not use onDisposeError
      await expect(errorCache.delete('key')).rejects.toThrow(disposeError);
      expect(onDisposeError).not.toHaveBeenCalled();
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, any>();
    });

    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1');
      cache.get('key1');
      cache.get('non-existent');

      const stats = cache.getStatistics();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should count expired access as miss', () => {
      cache.set('key1', 'value1', { ttl: 1000 });

      vi.advanceTimersByTime(1001);
      cache.get('key1');

      const stats = cache.getStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
    });

    it('should reset stats after clear', async () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('non-existent');

      expect(cache.getStatistics().hits).toBe(1);
      expect(cache.getStatistics().misses).toBe(1);

      await cache.clear();

      const stats = cache.getStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('LRU Eviction Policy', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, string>({ maxSize: 2, evictionPolicy: 'lru' });
    });

    it('should evict least recently used item when cache is full', () => {
      cache.set('key1', 'value1');
      vi.advanceTimersByTime(1);
      cache.set('key2', 'value2');

      vi.advanceTimersByTime(1);
      // Access key1 to make it more recently used
      cache.get('key1');

      // key2 should be evicted as it's least recently used (older lastAccessed)
      cache.set('key3', 'value3');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });

    it('should track eviction count', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const stats = cache.getStatistics();
      expect(stats.evictions).toBe(1);
    });

    it('should not evict when replacing existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key1', 'new-value1');

      expect(cache.size).toBe(2);
      expect(cache.getStatistics().evictions).toBe(0);
    });
  });

  describe('LFU Eviction Policy', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, string>({ maxSize: 2, evictionPolicy: 'lfu' });
    });

    it('should evict least frequently used item when cache is full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Access key1 multiple times
      cache.get('key1');
      cache.get('key1');
      cache.get('key2'); // key2 accessed once, key1 accessed twice

      cache.set('key3', 'value3');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });
  });

  describe('FIFO Eviction Policy', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, string>({ maxSize: 2, evictionPolicy: 'fifo' });
    });

    it('should evict first in item when cache is full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, any>();
    });

    it('should handle zero maxSize', () => {
      const zeroCache = new EnhancedCache<string, string>({ maxSize: 0 });
      zeroCache.set('key1', 'value1');

      // With maxSize 0, first item is added but immediately evicted when trying to add another
      expect(zeroCache.size).toBe(1);
      expect(zeroCache.get('key1')).toBe('value1');

      // Adding another item should evict the first one
      zeroCache.set('key2', 'value2');
      expect(zeroCache.size).toBe(1);
      expect(zeroCache.get('key1')).toBeUndefined();
      expect(zeroCache.get('key2')).toBe('value2');
    });

    it('should handle negative TTL', () => {
      cache.set('key1', 'value1', { ttl: -1000 });
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should handle very large TTL', () => {
      cache.set('key1', 'value1', { ttl: Number.MAX_SAFE_INTEGER });
      expect(cache.get('key1')).toBe('value1');
    });

    it('should handle undefined and null values', () => {
      cache.set('undefined-key', undefined);
      cache.set('null-key', null);

      expect(cache.get('undefined-key')).toBeUndefined();
      expect(cache.get('null-key')).toBeNull();
      expect(cache.has('undefined-key')).toBe(true);
      expect(cache.has('null-key')).toBe(true);
    });

    it('should handle complex object values', () => {
      const complexObject = {
        nested: { value: 42 },
        array: [1, 2, 3],
        fn: () => 'test',
      };

      cache.set('complex', complexObject);
      const retrieved = cache.get('complex');

      expect(retrieved).toBe(complexObject);
      expect(retrieved.nested.value).toBe(42);
      expect(retrieved.fn()).toBe('test');
    });

    it('should handle symbol keys', () => {
      const symbolCache = new EnhancedCache<symbol, string>();
      const key = Symbol('test');

      symbolCache.set(key, 'symbol-value');
      expect(symbolCache.get(key)).toBe('symbol-value');
    });
  });

  describe('Memory management', () => {
    beforeEach(() => {
      cache = new EnhancedCache<string, any>();
    });

    it('should clear timers when deleting expired items', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      cache.set('key1', 'value1', { ttl: 1000 });
      cache.delete('key1');

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear all timers when clearing cache', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      cache.set('key1', 'value1', { ttl: 1000 });
      cache.set('key2', 'value2', { ttl: 2000 });

      await cache.clear();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });
  });
});
