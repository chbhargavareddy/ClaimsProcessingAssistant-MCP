import Redis from 'ioredis';
import { config } from '../../config';

export class RedisService {
  private client: Redis;
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  constructor() {
    this.client = new Redis(config.REDIS_URL);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.entries(params)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}:${value}`)
      .join(':');
    return `${prefix}:${sortedParams}`;
  }

  // Helper method to wrap a function with caching
  async withCache<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>,
    invalidatePatterns: string[] = [],
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached) return cached;

    // If not in cache, execute function
    const result = await fn();

    // Store in cache
    await this.set(key, result, ttl);

    // Invalidate related cache entries if needed
    for (const pattern of invalidatePatterns) {
      await this.delPattern(pattern);
    }

    return result;
  }
} 