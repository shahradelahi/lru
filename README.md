# @se-oss/lru

[![CI](https://github.com/shahradelahi/lru/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/shahradelahi/lru/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/@se-oss/lru.svg)](https://www.npmjs.com/package/@se-oss/lru)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](/LICENSE)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/@se-oss/lru)
[![Install Size](https://packagephobia.com/badge?p=@se-oss/lru)](https://packagephobia.com/result?p=@se-oss/lru)

_@se-oss/lru_ is a feature-rich LRU cache engineered for high performance, offering excellent throughput on par with industry-standard libraries. It is designed for modern applications that require efficient caching with advanced features like TTL, size-based eviction, and asynchronous fetching.

---

- [Installation](#-installation)
- [Usage](#-usage)
- [Documentation](#-documentation)
- [Performance](#-performance)
- [Contributing](#-contributing)
- [License](#license)

## 📦 Installation

```bash
npm install @se-oss/lru
```

<details>
<summary>Install using your favorite package manager</summary>

**pnpm**

```bash
pnpm install @se-oss/lru
```

**yarn**

```bash
yarn add @se-oss/lru
```

</details>

## 📖 Usage

### Quick Example

_@se-oss/lru_ is a powerful and easy-to-use LRU cache for Node.js and the browser. Here’s a quick example to get you started:

```typescript
import { LRUCache } from '@se-oss/lru';

// Create a cache with a max of 100 items and a 5-minute TTL
const cache = new LRUCache<string, number>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});

// Set some values
cache.set('key1', 123);
cache.set('key2', 456);

// Get a value
console.log(cache.get('key1')); // 123

// Check if a key exists
console.log(cache.has('key2')); // true

// Delete a key
cache.delete('key1');
console.log(cache.has('key1')); // false

// The cache will automatically evict the least recently used items
// and expire items based on the TTL.
```

### With TTL (Time-To-Live)

```typescript
import { LRUCache } from '@se-oss/lru';

const cache = new LRUCache<string, string>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});

cache.set('session', 'user-session-data');

// The item will automatically expire after 5 minutes
```

### Asynchronous Fetching

The `fetch` method allows you to transparently handle cache misses by fetching data from an external source.

```typescript
import { LRUCache } from '@se-oss/lru';

const cache = new LRUCache<string, any>({
  max: 100,
  fetchMethod: async (key) => {
    console.log(`Fetching ${key} from API...`);
    const response = await fetch(`https://api.example.com/data/${key}`);
    return response.json();
  },
});

async function getData(key: string) {
  const data = await cache.fetch(key);
  console.log(data);
}

getData('user-profile'); // Fetches from API
getData('user-profile'); // Returns from cache
```

## 📚 Documentation

For all configuration options, please see [the API docs](https://www.jsdocs.io/package/@se-oss/lru).

## 🚀 Performance

| Library         | SET ops/sec  | GET ops/sec  | UPDATE ops/sec | DELETE ops/sec |
| --------------- | ------------ | ------------ | -------------- | -------------- |
| **@se-oss/lru** | 8,114,097    | 17,025,882   | 15,652,000     | 31,312,221     |
| tiny-lru        | 3,852,093    | _28,034,336_ | _26,054,100_   | 17,988,030     |
| lru-cache       | 9,556,046    | 18,433,743   | 17,211,778     | _30,403,130_   |
| quick-lru       | _15,562,323_ | 10,461,517   | 15,029,425     | 28,062,475     |

_Benchmark script: [`src/index.bench.ts`](src/index.bench.ts)_

**Note on `tiny-lru`**: The impressive `GET` and `UPDATE` performance of `tiny-lru` is largely due to its minimalist design. It is a raw LRU implementation and lacks many of the advanced features (like `fetch`, size-based eviction, and detailed callbacks) found in `@se-oss/lru` and `lru-cache`. This results in lower overhead for basic operations.

## 🤝 Contributing

Want to contribute? Awesome! To show your support is to star the project, or to raise issues on [GitHub](https://github.com/shahradelahi/lru)

Thanks again for your support, it is much appreciated! 🙏

## License

[MIT](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/lru/graphs/contributors).
