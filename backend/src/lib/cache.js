const cache = new Map();
const DEFAULT_TTL = 15_000;

function set(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, { value, expiry: Date.now() + ttl });
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function del(pattern) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
}

function flush() {
  cache.clear();
}

module.exports = { set, get, del, flush };
