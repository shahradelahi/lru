import { LRUCache as OurLRUCache } from '@se-oss/lru';
import { LRUCache as LruCache } from 'lru-cache';
import QuickLRU from 'quick-lru';
import { lru as TinyLRU } from 'tiny-lru';
import { bench, describe } from 'vitest';

const max = 1000;

describe('set', () => {
  let i = 0;
  const ourCache = new OurLRUCache({ max });
  const lruCache = new LruCache({ max });
  const quickLru = new QuickLRU({ maxSize: max });
  const tinyLru = TinyLRU(max);

  bench('@se-oss/lru', () => {
    ourCache.set(i++, i);
  });

  bench('lru-cache', () => {
    lruCache.set(i++, i);
  });

  bench('quick-lru', () => {
    quickLru.set(i++, i);
  });

  bench('tiny-lru', () => {
    tinyLru.set(i++, i);
  });
});

describe('get', () => {
  let i = 0;
  const ourCache = new OurLRUCache({ max });
  const lruCache = new LruCache({ max });
  const quickLru = new QuickLRU({ maxSize: max });
  const tinyLru = TinyLRU(max);

  for (let j = 0; j < max; j++) {
    ourCache.set(j, j);
    lruCache.set(j, j);
    quickLru.set(j, j);
    tinyLru.set(j, j);
  }

  bench('@se-oss/lru', () => {
    ourCache.get(i++ % max);
  });

  bench('lru-cache', () => {
    lruCache.get(i++ % max);
  });

  bench('quick-lru', () => {
    quickLru.get(i++ % max);
  });

  bench('tiny-lru', () => {
    tinyLru.get(i++ % max);
  });
});

describe('update', () => {
  let i = 0;
  const ourCache = new OurLRUCache({ max });
  const lruCache = new LruCache({ max });
  const quickLru = new QuickLRU({ maxSize: max });
  const tinyLru = TinyLRU(max);

  for (let j = 0; j < max; j++) {
    ourCache.set(j, j);
    lruCache.set(j, j);
    quickLru.set(j, j);
    tinyLru.set(j, j);
  }

  bench('@se-oss/lru', () => {
    const key = i++ % max;
    ourCache.set(key, key + 1);
  });

  bench('lru-cache', () => {
    const key = i++ % max;
    lruCache.set(key, key + 1);
  });

  bench('quick-lru', () => {
    const key = i++ % max;
    quickLru.set(key, key + 1);
  });

  bench('tiny-lru', () => {
    const key = i++ % max;
    tinyLru.set(key, key + 1);
  });
});

describe('delete', () => {
  let i = 0;
  const ourCache = new OurLRUCache({ max });
  const lruCache = new LruCache({ max });
  const quickLru = new QuickLRU({ maxSize: max });
  const tinyLru = TinyLRU(max);

  for (let j = 0; j < max; j++) {
    ourCache.set(j, j);
    lruCache.set(j, j);
    quickLru.set(j, j);
    tinyLru.set(j, j);
  }

  bench('@se-oss/lru', () => {
    ourCache.delete(i++ % max);
  });

  bench('lru-cache', () => {
    lruCache.delete(i++ % max);
  });

  bench('quick-lru', () => {
    quickLru.delete(i++ % max);
  });

  bench('tiny-lru', () => {
    tinyLru.delete(i++ % max);
  });
});
