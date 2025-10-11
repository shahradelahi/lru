import type { DisposeReason, Fetcher, LRUCacheOptions, Node } from './typings';

/**
 * A feature-rich LRU cache engineered for high performance, offering excellent throughput on par with industry-standard libraries.
 * It is designed for modern applications that require efficient caching with advanced features like TTL,
 * size-based eviction, and asynchronous fetching.
 * @template K The type of the key.
 * @template V The type of the value.
 */
export class LRUCache<K, V> {
  #max: number;
  #size: number = 0;
  #cache: Map<K, Node<K, V>> = new Map();
  #head?: Node<K, V>;
  #tail?: Node<K, V>;

  #ttl?: number;
  #maxSize?: number;
  #sizeCalculation: (value: V, key: K) => number = () => 1;
  #calculatedSize: number = 0;

  #dispose?: (key: K, value: V, reason: DisposeReason) => void;
  #fetchMethod?: Fetcher<K, V>;
  #inflight: Map<K, Promise<V | undefined>> = new Map();
  #reapTimer?: NodeJS.Timeout;

  /**
   * Creates a new LRUCache instance.
   * @param {LRUCacheOptions<K, V>} options The options for the cache.
   * @example
   * const cache = new LRUCache<string, number>({ max: 100 });
   */
  constructor(options: LRUCacheOptions<K, V>) {
    this.#max = options.max;
    this.#ttl = options.ttl;
    this.#maxSize = options.maxSize;
    if (options.sizeCalculation) {
      this.#sizeCalculation = options.sizeCalculation;
    }
    this.#dispose = options.dispose;
    this.#fetchMethod = options.fetchMethod;

    if (options.reapInterval && options.reapInterval > 0) {
      this.#reapTimer = setInterval(() => this.reap(), options.reapInterval);
    }
  }

  /**
   * The number of items currently in the cache.
   * @returns {number} The number of items.
   */
  get size(): number {
    return this.#size;
  }

  /**
   * Manually scans the cache and removes all expired items.
   */
  reap(): void {
    for (let node = this.#tail; node; node = node.prev) {
      if (this.#isStale(node)) {
        this.#deleteInternal(node, 'expire');
      }
    }
  }

  /**
   * Stops the automatic reaping of expired items.
   */
  stopReaping(): void {
    if (this.#reapTimer) {
      clearInterval(this.#reapTimer);
      this.#reapTimer = undefined;
    }
  }

  /**
   * Adds or updates an item in the cache.
   * @param {K} key The key of the item.
   * @param {V} value The value of the item.
   * @param {{ ttl?: number }} [options] Options for setting the item.
   * @returns {this} The cache instance.
   * @example
   * cache.set('key1', 'value1');
   * cache.set('key2', 'value2', { ttl: 1000 }); // 1 second TTL
   */
  set(key: K, value: V, options?: { ttl?: number }): this {
    let node = this.#cache.get(key);
    const size = this.#sizeCalculation(value, key);

    if (node) {
      const oldSize = node.size;
      node.value = value;
      node.size = size;
      this.#calculatedSize += size - oldSize;
      this.#moveToHead(node);
      this.#setTTL(node, options?.ttl);
      if (this.#dispose) {
        this.#dispose(key, node.value, 'set');
      }
    } else {
      node = { key, value, size };
      this.#cache.set(key, node);
      this.#size++;
      this.#calculatedSize += size;
      if (this.#size === 1) {
        this.#head = this.#tail = node;
      } else {
        this.#head!.prev = node;
        node.next = this.#head;
        this.#head = node;
      }
      this.#setTTL(node, options?.ttl);
    }

    if (this.#max > 0 && this.#size > this.#max) {
      this.#evict();
    }
    this.#evictToSize();
    return this;
  }

  /**
   * Retrieves an item from the cache.
   * @param {K} key The key of the item to retrieve.
   * @param {{ allowStale?: boolean }} [options] Options for getting the item.
   * @returns {V | undefined} The value of the item, or undefined if not found.
   * @example
   * const value = cache.get('key1');
   */
  get(key: K, options?: { allowStale?: boolean }): V | undefined {
    const node = this.#cache.get(key);

    if (!node) {
      return undefined;
    }

    if (this.#isStale(node)) {
      if (options?.allowStale) {
        return node.value;
      }
      this.#deleteInternal(node, 'expire');
      return undefined;
    }

    this.#moveToHead(node);
    return node.value;
  }

  /**
   * Retrieves an item, fetching it if it's not in the cache.
   * @param {K} key The key of the item to fetch.
   * @param {{ allowStale?: boolean }} [options] Options for fetching the item.
   * @returns {Promise<V | undefined>} A promise that resolves to the value of the item.
   * @example
   * const value = await cache.fetch('key1');
   */
  async fetch(key: K, options?: { allowStale?: boolean }): Promise<V | undefined> {
    const node = this.#cache.get(key);

    if (node && !this.#isStale(node)) {
      this.#moveToHead(node);
      return node.value;
    }

    if (this.#inflight.has(key)) {
      return this.#inflight.get(key);
    }

    if (node && this.#isStale(node) && options?.allowStale) {
      // Non-blocking revalidation
      this.#fetchAndSet(key).catch(() => {
        // Background fetch failed, ignore
      });
      return node.value;
    }

    if (!this.#fetchMethod) {
      if (node) {
        this.#deleteInternal(node, 'expire');
      }
      return undefined;
    }

    return this.#fetchAndSet(key);
  }

  async #fetchAndSet(key: K): Promise<V | undefined> {
    if (!this.#fetchMethod) {
      return undefined;
    }

    const promise = this.#fetchMethod(key);
    this.#inflight.set(key, promise);

    try {
      const value = await promise;
      if (value !== undefined) {
        this.set(key, value);
      }
      return value;
    } finally {
      this.#inflight.delete(key);
    }
  }

  /**
   * Checks if an item exists in the cache.
   * @param {K} key The key of the item to check.
   * @returns {boolean} True if the item exists, false otherwise.
   * @example
   * if (cache.has('key1')) {
   *   // ...
   * }
   */
  has(key: K): boolean {
    const node = this.#cache.get(key);
    if (!node) {
      return false;
    }
    if (this.#isStale(node)) {
      return false;
    }
    return true;
  }

  /**
   * Removes an item from the cache.
   * @param {K} key The key of the item to remove.
   * @returns {boolean} True if the item was removed, false otherwise.
   * @example
   * cache.delete('key1');
   */
  delete(key: K): boolean {
    const node = this.#cache.get(key);

    if (!node) {
      return false;
    }

    this.#deleteInternal(node, 'delete');
    return true;
  }

  /**
   * Clears the entire cache.
   * @example
   * cache.clear();
   */
  clear(): void {
    this.stopReaping();
    if (this.#dispose) {
      for (const [key, node] of this.#cache) {
        this.#dispose(key, node.value, 'delete');
      }
    }
    this.#cache.clear();
    this.#head = this.#tail = undefined;
    this.#size = 0;
    this.#calculatedSize = 0;
  }

  /**
   * Returns the remaining time-to-live for an item in milliseconds.
   * @param {K} key The key of the item.
   * @returns {number} The remaining time-to-live in milliseconds.
   * @example
   * const ttl = cache.getRemainingTTL('key1');
   */
  getRemainingTTL(key: K): number {
    const node = this.#cache.get(key);
    if (!node || !node.expiry) {
      return 0;
    }
    const remaining = node.expiry - Date.now();
    return remaining < 0 ? 0 : remaining;
  }

  /**
   * Returns an iterator for the keys in the cache.
   * @returns {Generator<K>} An iterator for the keys.
   * @example
   * for (const key of cache.keys()) {
   *   // ...
   * }
   */
  *keys(): Generator<K> {
    for (let node = this.#head; node; node = node.next) {
      if (!this.#isStale(node)) {
        yield node.key;
      }
    }
  }

  /**
   * Returns an iterator for the values in the cache.
   * @returns {Generator<V>} An iterator for the values.
   * @example
   * for (const value of cache.values()) {
   *   // ...
   * }
   */
  *values(): Generator<V> {
    for (let node = this.#head; node; node = node.next) {
      if (!this.#isStale(node)) {
        yield node.value;
      }
    }
  }

  /**
   * Returns an iterator for the entries in the cache.
   * @returns {Generator<[K, V]>} An iterator for the entries.
   * @example
   * for (const [key, value] of cache.entries()) {
   *   // ...
   * }
   */
  *entries(): Generator<[K, V]> {
    for (let node = this.#head; node; node = node.next) {
      if (!this.#isStale(node)) {
        yield [node.key, node.value];
      }
    }
  }

  /**
   * Returns an iterator for the entries in the cache.
   * @returns {Generator<[K, V]>} An iterator for the entries.
   * @example
   * for (const [key, value] of cache) {
   *   // ...
   * }
   */
  [Symbol.iterator](): Generator<[K, V]> {
    return this.entries();
  }

  #setTTL(node: Node<K, V>, ttl?: number): void {
    const newTtl = ttl ?? this.#ttl;
    if (newTtl) {
      node.expiry = Date.now() + newTtl;
    }
  }

  #isStale(node: Node<K, V>): boolean {
    return !!node.expiry && node.expiry < Date.now();
  }

  #moveToHead(node: Node<K, V>): void {
    if (node === this.#head) {
      return;
    }

    const { prev, next } = node;

    if (prev) {
      prev.next = next;
    } else {
      this.#head = next;
    }

    if (next) {
      next.prev = prev;
    } else {
      this.#tail = prev;
    }

    this.#head!.prev = node;
    node.next = this.#head;
    node.prev = undefined;
    this.#head = node;
  }

  #evict(): void {
    const tail = this.#tail!;
    if (this.#dispose) {
      this.#dispose(tail.key, tail.value, 'evict');
    }
    this.#calculatedSize -= tail.size;
    this.#cache.delete(tail.key);
    this.#deleteNode(tail);
    this.#size--;
  }

  #evictToSize(): void {
    if (!this.#maxSize) return;
    while (this.#calculatedSize > this.#maxSize && this.#tail) {
      this.#evict();
    }
  }

  #deleteNode(node: Node<K, V>): void {
    const { prev, next } = node;
    if (prev) {
      prev.next = next;
    } else {
      this.#head = next;
    }
    if (next) {
      next.prev = prev;
    } else {
      this.#tail = prev;
    }
  }

  #deleteInternal(node: Node<K, V>, reason: DisposeReason): void {
    if (this.#dispose) {
      this.#dispose(node.key, node.value, reason);
    }
    this.#calculatedSize -= node.size;
    this.#cache.delete(node.key);
    this.#deleteNode(node);
    this.#size--;
  }
}
