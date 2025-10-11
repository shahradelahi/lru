/**
 * Options for configuring the LRU cache.
 * @template K The type of the key.
 * @template V The type of the value.
 */
export interface LRUCacheOptions<K, V> {
  /** The maximum number of items to store in the cache. */
  max: number;
  /** The time-to-live for items in milliseconds. */
  ttl?: number;
  /** The maximum size of the cache. */
  maxSize?: number;
  /** A function to calculate the size of each item. */
  sizeCalculation?: (value: V, key: K) => number;
  /** A function called when an item is removed from the cache. */
  dispose?: (key: K, value: V, reason: DisposeReason) => void;
  /** An asynchronous function to fetch a value when it's not in the cache. */
  fetchMethod?: Fetcher<K, V>;
  /** The interval in milliseconds to periodically check for and remove expired items. */
  reapInterval?: number;
}

/**
 * An asynchronous function to fetch a value.
 * @template K The type of the key.
 * @template V The type of the value.
 */
export type Fetcher<K, V> = (key: K) => Promise<V | undefined>;

/** The reason for disposing an item from the cache. */
export type DisposeReason = 'evict' | 'set' | 'delete' | 'expire';

/**
 * Represents a node in the doubly linked list.
 * @internal
 * @template K The type of the key.
 * @template V The type of the value.
 */
export interface Node<K, V> {
  /** The key of the item. */
  key: K;
  /** The value of the item. */
  value: V;
  /** The previous node in the list. */
  prev?: Node<K, V>;
  /** The next node in the list. */
  next?: Node<K, V>;
  /** The expiry timestamp of the item. */
  expiry?: number;
  /** The size of the item. */
  size: number;
}
