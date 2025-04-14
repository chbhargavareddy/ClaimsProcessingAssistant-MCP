import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

export const config = {
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_ANON_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

type ConfigKey = keyof typeof config;

// Validate required configuration based on context
const baseRequiredEnvVars = [] as const;

// Add Supabase vars if not running Claude-only tests
const isClaudeOnlyTest = process.env.TEST_SCOPE === 'claude';
const requiredEnvVars = isClaudeOnlyTest
  ? [...baseRequiredEnvVars]
  : [...baseRequiredEnvVars, 'SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];

// Add Claude API key requirement in non-test environments
if (process.env.NODE_ENV !== 'test') {
  requiredEnvVars.push('CLAUDE_API_KEY');
}

for (const envVar of requiredEnvVars) {
  if (!config[envVar as ConfigKey]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}