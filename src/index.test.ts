import { describe, expect, it, vi } from 'vitest';

import { LRUCache } from './index';

describe('LRUCache', () => {
  it('should set and get values', () => {
    const cache = new LRUCache<string, string>({ max: 3 });
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
    expect(cache.size).toBe(1);
  });

  it('should return undefined for non-existent keys', () => {
    const cache = new LRUCache<string, string>({ max: 3 });
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should evict least recently used item when max is reached', () => {
    const cache = new LRUCache<string, string>({ max: 3 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4');

    expect(cache.size).toBe(3);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  it('should update position when accessing existing item', () => {
    const cache = new LRUCache<string, string>({ max: 3 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    cache.get('key1');

    cache.set('key4', 'value4');

    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  it('should delete items', () => {
    const cache = new LRUCache<string, string>({ max: 3 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);

    cache.delete('key1');
    expect(cache.size).toBe(1);
    expect(cache.has('key1')).toBe(false);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should return false when deleting non-existent key', () => {
    const cache = new LRUCache<string, string>({ max: 3 });
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('should clear all items', () => {
    const cache = new LRUCache<string, string>({ max: 3 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
  });

  it('should check if key exists with has()', () => {
    const cache = new LRUCache<string, string>({ max: 3 });
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  describe('TTL', () => {
    it('should expire items after ttl', async () => {
      const cache = new LRUCache<string, string>({ max: 3, ttl: 50 });
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      await new Promise((r) => setTimeout(r, 100));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire items if ttl is not set', async () => {
      const cache = new LRUCache<string, string>({ max: 3 });
      cache.set('key1', 'value1');
      await new Promise((r) => setTimeout(r, 100));
      expect(cache.get('key1')).toBe('value1');
    });

    it('should get remaining ttl', async () => {
      const cache = new LRUCache<string, string>({ max: 3, ttl: 100 });
      cache.set('key1', 'value1');
      expect(cache.getRemainingTTL('key1')).toBeGreaterThan(50);
      expect(cache.getRemainingTTL('key1')).toBeLessThanOrEqual(100);
      await new Promise((r) => setTimeout(r, 50));
      expect(cache.getRemainingTTL('key1')).toBeGreaterThan(0);
      expect(cache.getRemainingTTL('key1')).toBeLessThanOrEqual(50);
    });
  });

  describe('maxSize', () => {
    it('should evict items to stay under maxSize', () => {
      const cache = new LRUCache<string, string>({
        max: 10,
        maxSize: 10,
        sizeCalculation: (value) => value.length,
      });
      cache.set('key1', '12345');
      cache.set('key2', '12345');
      expect(cache.size).toBe(2);
      cache.set('key3', '1');
      expect(cache.size).toBe(2);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should call dispose on eviction', () => {
      const dispose = vi.fn();
      const cache = new LRUCache<string, string>({ max: 2, dispose });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      expect(dispose).toHaveBeenCalledWith('key1', 'value1', 'evict');
    });

    it('should call dispose on set', () => {
      const dispose = vi.fn();
      const cache = new LRUCache<string, string>({ max: 2, dispose });
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(dispose).toHaveBeenCalledWith('key1', 'value2', 'set');
    });

    it('should call dispose on delete', () => {
      const dispose = vi.fn();
      const cache = new LRUCache<string, string>({ max: 2, dispose });
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(dispose).toHaveBeenCalledWith('key1', 'value1', 'delete');
    });
  });

  describe('fetch', () => {
    it('should return cached value on hit', async () => {
      const fetcher = vi.fn();
      const cache = new LRUCache<string, string>({ max: 3, fetchMethod: fetcher });
      cache.set('key1', 'value1');
      const value = await cache.fetch('key1');
      expect(value).toBe('value1');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch value on miss', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-value');
      const cache = new LRUCache<string, string>({ max: 3, fetchMethod: fetcher });
      const value = await cache.fetch('key1');
      expect(value).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledWith('key1');
      expect(cache.get('key1')).toBe('fetched-value');
    });

    it('should handle concurrent fetches for the same key', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-value');
      const cache = new LRUCache<string, string>({ max: 3, fetchMethod: fetcher });
      const [v1, v2] = await Promise.all([cache.fetch('key1'), cache.fetch('key1')]);
      expect(v1).toBe('fetched-value');
      expect(v2).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should not cache undefined fetched value', async () => {
      const fetcher = vi.fn().mockResolvedValue(undefined);
      const cache = new LRUCache<string, string | undefined>({ max: 3, fetchMethod: fetcher });
      const value = await cache.fetch('key1');
      expect(value).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });

    it('should handle fetch rejection', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('fetch error'));
      const cache = new LRUCache<string, string>({ max: 3, fetchMethod: fetcher });
      await expect(cache.fetch('key1')).rejects.toThrow('fetch error');
      expect(cache.has('key1')).toBe(false);
    });

    it('should return stale value and revalidate in background', async () => {
      const fetcher = vi.fn().mockResolvedValue('new-value');
      const cache = new LRUCache<string, string>({
        max: 3,
        ttl: 50,
        fetchMethod: fetcher,
      });

      cache.set('key1', 'stale-value');
      await new Promise((r) => setTimeout(r, 100)); // Wait for item to become stale

      const value = await cache.fetch('key1', { allowStale: true });
      expect(value).toBe('stale-value'); // Returns stale value immediately
      expect(fetcher).toHaveBeenCalledWith('key1'); // Triggers fetch in background

      await new Promise((r) => setTimeout(r, 50)); // Wait for fetch to complete

      expect(cache.get('key1', { allowStale: true })).toBe('new-value'); // Cache is updated with new value
    });

    it('should return stale value if allowStale is true', async () => {
      const cache = new LRUCache<string, string>({ max: 3, ttl: 50 });
      cache.set('key1', 'value1');
      await new Promise((r) => setTimeout(r, 100));
      const value = cache.get('key1', { allowStale: true });
      expect(value).toBe('value1');
    });
  });

  describe('iterators', () => {
    it('should iterate over keys in LRU order', () => {
      const cache = new LRUCache<string, string>({ max: 3 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.get('key1');
      expect([...cache.keys()]).toEqual(['key1', 'key3', 'key2']);
    });

    it('should iterate over values in LRU order', () => {
      const cache = new LRUCache<string, string>({ max: 3 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.get('key1');
      expect([...cache.values()]).toEqual(['value1', 'value3', 'value2']);
    });

    it('should iterate over entries in LRU order', () => {
      const cache = new LRUCache<string, string>({ max: 3 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.get('key1');
      const expected = [
        ['key1', 'value1'],
        ['key3', 'value3'],
        ['key2', 'value2'],
      ];
      expect([...cache.entries()]).toEqual(expected);
      expect([...cache]).toEqual(expected);
    });
  });

  describe('reap', () => {
    it('should manually reap expired items', async () => {
      const cache = new LRUCache<string, string>({ max: 3, ttl: 50 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      await new Promise((r) => setTimeout(r, 100));
      cache.reap();
      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });

    it('should automatically reap expired items with reapInterval', async () => {
      const cache = new LRUCache<string, string>({
        max: 3,
        ttl: 50,
        reapInterval: 50,
      });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      await new Promise((r) => setTimeout(r, 150));
      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      cache.stopReaping();
    });
  });
});
