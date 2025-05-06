import { RateLimitService, RateLimitConfig } from '../../../services/rate-limit/rate-limit.service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('RateLimitService', () => {
  let rateLimitService: RateLimitService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock Redis instance
    mockRedis = {
      multi: jest.fn().mockReturnThis(),
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 1], // zremrangebyscore result
        [null, 1], // zcard result
        [null, 1], // zadd result
        [null, 1], // expire result
      ]),
      zrange: jest.fn().mockResolvedValue(['1234567890', '1234567890']),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<Redis>;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    rateLimitService = new RateLimitService();
  });

  afterEach(async () => {
    // Clean up test data
    await rateLimitService.clearLimit('test-user', 'test-action');
    await rateLimitService.clearLimit('test-user', 'action1');
    await rateLimitService.clearLimit('test-user', 'action2');
    await rateLimitService.clearLimit('user1', 'test-action');
    await rateLimitService.clearLimit('user2', 'test-action');
  });

  const testConfig: RateLimitConfig = {
    points: 3,
    duration: 60,
    blockDuration: 120,
  };

  it('should allow requests within limits', async () => {
    // Mock Redis response for allowed request
    mockRedis.exec.mockResolvedValueOnce([
      [null, 1], // zremrangebyscore result
      [null, 1], // zcard result - one request (including current)
      [null, 1], // zadd result
      [null, 1], // expire result
    ]);

    const result = await rateLimitService.checkLimit('test-user', 'test-action', testConfig);

    expect(result.isAllowed).toBe(true);
    expect(result.remaining).toBe(2); // points(3) - current requests(1) = 2
    expect(result.resetTime).toBeDefined();
  });

  it('should block requests when limit exceeded', async () => {
    // Mock Redis responses for initial requests
    mockRedis.exec
      .mockResolvedValueOnce([
        [null, 1], // First request
        [null, 1],
        [null, 1],
        [null, 1],
      ])
      .mockResolvedValueOnce([
        [null, 1], // Second request
        [null, 2],
        [null, 1],
        [null, 1],
      ])
      .mockResolvedValueOnce([
        [null, 1], // Third request
        [null, 3],
        [null, 1],
        [null, 1],
      ])
      .mockResolvedValueOnce([
        [null, 1], // Fourth request (should be blocked)
        [null, 4],
        [null, 1],
        [null, 1],
      ]);

    // Make 3 requests (limit)
    for (let i = 0; i < testConfig.points; i++) {
      await rateLimitService.checkLimit('test-user', 'test-action', testConfig);
    }

    // Try one more request
    const result = await rateLimitService.checkLimit('test-user', 'test-action', testConfig);

    expect(result.isAllowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.resetTime).toBeDefined();
  });

  it('should track different actions separately', async () => {
    // Mock Redis responses for different actions
    mockRedis.exec.mockResolvedValueOnce([
      [null, 1],
      [null, 1], // action1 has 1 request
      [null, 1],
      [null, 1],
    ]);

    // Should allow requests for different action
    const result = await rateLimitService.checkLimit('test-user', 'action2', testConfig);

    expect(result.isAllowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should track different users separately', async () => {
    // Mock Redis responses for different users
    mockRedis.exec.mockResolvedValueOnce([
      [null, 1],
      [null, 1], // user2 has 1 request
      [null, 1],
      [null, 1],
    ]);

    // Should allow requests for different user
    const result = await rateLimitService.checkLimit('user2', 'test-action', testConfig);

    expect(result.isAllowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should clear limits when requested', async () => {
    // Mock Redis responses
    mockRedis.exec.mockResolvedValueOnce([
      [null, 1],
      [null, 1], // One request after clearing
      [null, 1],
      [null, 1],
    ]);

    // Clear the limit
    await rateLimitService.clearLimit('test-user', 'test-action');

    // Should be able to make requests again
    const result = await rateLimitService.checkLimit('test-user', 'test-action', testConfig);

    expect(result.isAllowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should handle block duration correctly', async () => {
    // Mock Redis responses
    mockRedis.exec.mockResolvedValueOnce([
      [null, 1],
      [null, 4], // More requests than allowed
      [null, 1],
      [null, 1],
    ]);

    // Verify blocked state
    const result = await rateLimitService.checkLimit('test-user', 'test-action', testConfig);
    expect(result.isAllowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    if (result.retryAfter && testConfig.blockDuration) {
      expect(result.retryAfter).toBeLessThanOrEqual(testConfig.blockDuration);
    }
  });

  it('should handle config without block duration', async () => {
    const configWithoutBlock: RateLimitConfig = {
      points: 2,
      duration: 30,
    };

    // Mock Redis responses
    mockRedis.exec.mockResolvedValueOnce([
      [null, 1],
      [null, 3], // More requests than allowed
      [null, 1],
      [null, 1],
    ]);

    // Verify rate limited state
    const result = await rateLimitService.checkLimit(
      'test-user',
      'test-action',
      configWithoutBlock,
    );
    expect(result.isAllowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetTime).toBeDefined();
    expect(result.retryAfter).toBeDefined();
  });

  it('should handle concurrent requests correctly', async () => {
    const concurrentConfig: RateLimitConfig = {
      points: 5,
      duration: 30,
    };

    let requestCount = 0;
    // Mock Redis responses for concurrent requests
    mockRedis.exec.mockImplementation(async () => {
      requestCount++;
      return [
        [null, 1],
        [null, requestCount], // Simulate atomic increment
        [null, 1],
        [null, 1],
      ];
    });

    // Make multiple concurrent requests
    const requests = Array(10)
      .fill(null)
      .map(() => rateLimitService.checkLimit('test-user', 'test-action', concurrentConfig));

    const results = await Promise.all(requests);

    // Verify results maintain rate limit
    const allowedCount = results.filter((r) => r.isAllowed).length;
    expect(allowedCount).toBeLessThanOrEqual(concurrentConfig.points);
  });

  it('should handle Redis errors gracefully', async () => {
    // Mock Redis error
    mockRedis.exec.mockRejectedValueOnce(new Error('Redis connection error'));

    await expect(
      rateLimitService.checkLimit('test-user', 'test-action', testConfig),
    ).rejects.toThrow('Redis connection error');
  });
});
