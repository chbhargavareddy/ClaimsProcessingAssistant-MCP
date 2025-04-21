// Mock dotenv before any imports
jest.mock('dotenv', () => {
  const mockConfig = jest.fn().mockReturnValue({ parsed: {} });
  return {
    __esModule: true,
    default: {
      config: mockConfig,
    },
  };
});

describe('config', () => {
  // Store original env
  const originalEnv = process.env;

  // Helper to set up required environment variables
  const setupRequiredEnvVars = () => {
    process.env.SUPABASE_URL = 'test-url';
    process.env.SUPABASE_ANON_KEY = 'test-key';
    process.env.JWT_SECRET = 'test-secret';
  };

  beforeEach(() => {
    // Clear module cache to allow re-importing with different env
    jest.resetModules();
    // Reset process.env to a clean state
    process.env = {
      ...originalEnv,
      CLAUDE_API_KEY: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_ANON_KEY: undefined,
      JWT_SECRET: undefined,
      PORT: undefined,
      NODE_ENV: undefined,
      TEST_SCOPE: undefined,
    };
    // Reset mock call history
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('environment loading', () => {
    it('should load test environment when NODE_ENV is test', async () => {
      // Set NODE_ENV before importing config
      process.env.NODE_ENV = 'test';
      // Set up required environment variables
      setupRequiredEnvVars();
      // Clear cache and import config module
      jest.resetModules();
      const dotenv = await import('dotenv');
      await import('../../config');
      // Verify dotenv was called correctly
      expect(dotenv.default.config).toHaveBeenCalledWith({ path: '.env.test' });
      expect(dotenv.default.config).toHaveBeenCalledTimes(1);
    });

    it('should load default environment when NODE_ENV is not test', async () => {
      // Set NODE_ENV before importing config
      process.env.NODE_ENV = 'development';
      // Set up required environment variables and CLAUDE_API_KEY for non-test env
      setupRequiredEnvVars();
      process.env.CLAUDE_API_KEY = 'test-claude-key';
      // Clear cache and import config module
      jest.resetModules();
      const dotenv = await import('dotenv');
      await import('../../config');
      // Verify dotenv was called correctly
      expect(dotenv.default.config).toHaveBeenCalledWith();
      expect(dotenv.default.config).toHaveBeenCalledTimes(1);
    });
  });

  describe('config validation', () => {
    it('should not require CLAUDE_API_KEY in test environment', async () => {
      // Set up test environment
      process.env.NODE_ENV = 'test';
      setupRequiredEnvVars();
      // Clear cache and import config
      jest.resetModules();
      const { config } = await import('../../config');
      expect(config.CLAUDE_API_KEY).toBe('');
    });

    it('should require CLAUDE_API_KEY in non-test environment', async () => {
      // Set up production-like environment without CLAUDE_API_KEY
      process.env.NODE_ENV = 'development';
      setupRequiredEnvVars();
      // Clear cache and verify import throws
      jest.resetModules();
      await expect(async () => {
        await import('../../config');
      }).rejects.toThrow('Missing required environment variable: CLAUDE_API_KEY');
    });

    it('should not require Supabase vars in claude-only test', async () => {
      // Set up claude-only test environment
      process.env.NODE_ENV = 'test';
      process.env.TEST_SCOPE = 'claude';
      // Clear cache and import config
      jest.resetModules();
      const { config } = await import('../../config');
      expect(config.SUPABASE_URL).toBe('');
      expect(config.SUPABASE_KEY).toBe('');
      expect(config.JWT_SECRET).toBe('');
    });

    it('should require Supabase vars in non-claude-only test', async () => {
      // Set up test environment without Supabase vars
      process.env.NODE_ENV = 'test';
      // Clear cache and verify import throws
      jest.resetModules();
      await expect(async () => {
        await import('../../config');
      }).rejects.toThrow('Missing required environment variable: SUPABASE_URL');
    });

    it('should use default values for optional configs', async () => {
      // Set up minimal valid environment
      process.env.NODE_ENV = 'test';
      setupRequiredEnvVars();
      // Clear cache and import config
      jest.resetModules();
      const { config } = await import('../../config');
      expect(config.PORT).toBe(3000);
      expect(config.NODE_ENV).toBe('test');
    });

    it('should use provided values for optional configs', async () => {
      // Set up environment with custom values
      process.env.NODE_ENV = 'test';
      setupRequiredEnvVars();
      process.env.PORT = '4000';
      // Clear cache and import config
      jest.resetModules();
      const { config } = await import('../../config');
      expect(config.PORT).toBe(4000);
    });
  });
});
