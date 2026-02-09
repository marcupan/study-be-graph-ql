import type { KeyValueCache } from '@apollo/utils.keyvaluecache';
import { LRUCache } from 'lru-cache';

export class LruKeyValueCache implements KeyValueCache {
  private store: LRUCache<string, string>;

  constructor() {
    this.store = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 10,
    });
  }

  async get(key: string): Promise<string | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
