import Redis from 'ioredis';
import { config } from '../../config';

export interface RateLimitConfig {
  points: number; // Number of requests allowed
  duration: number; // Time window in seconds
  blockDuration?: number; // How long to block if limit exceeded (optional)
}

export class RateLimitService {
  private redis: Redis;
  private readonly keyPrefix = 'ratelimit';

  constructor() {
    this.redis = new Redis(config.REDIS_URL);
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier for the client (e.g., IP address or API key)
   * @param action - The action being rate limited (e.g., 'submit-claim', 'validate-claim')
   * @param config - Rate limit configuration
   * @returns Object containing limit info and whether request is allowed
   */
  async checkLimit(
    identifier: string,
    action: string,
    config: RateLimitConfig,
  ): Promise<{
    isAllowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = this.generateKey(identifier, action);
    const now = Math.floor(Date.now() / 1000);

    // Use Redis transaction to ensure atomic operations
    const multi = this.redis.multi();

    // Clean old records outside the time window
    multi.zremrangebyscore(key, 0, now - config.duration);

    // Count requests in current window
    multi.zcard(key);

    // Add current request timestamp
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry on the set
    multi.expire(key, config.duration);

    const [, currentCount] = (await multi.exec()) as [any, [null, number]];
    const count = currentCount[1];

    if (count >= config.points) {
      // Get oldest request timestamp
      const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = parseInt(oldestRequest[1]) + config.duration;
      const retryAfter = resetTime - now;

      if (config.blockDuration) {
        // If block duration specified, block for that duration
        await this.redis.setex(`${key}:blocked`, config.blockDuration, 'blocked');
      }

      return {
        isAllowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    return {
      isAllowed: true,
      remaining: config.points - count,
      resetTime: now + config.duration,
    };
  }

  /**
   * Generate a unique Redis key for rate limiting
   */
  private generateKey(identifier: string, action: string): string {
    return `${this.keyPrefix}:${action}:${identifier}`;
  }

  /**
   * Clear rate limit data for testing purposes
   */
  async clearLimit(identifier: string, action: string): Promise<void> {
    const key = this.generateKey(identifier, action);
    await this.redis.del(key, `${key}:blocked`);
  }
}
