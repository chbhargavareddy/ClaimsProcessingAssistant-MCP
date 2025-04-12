import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Create Supabase client for tests with mock values if env vars are not set
export const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_KEY || 'test-key'
);

// Global test setup
beforeAll(() => {
  // Add any global test setup here
});

// Global test teardown
afterAll(() => {
  // Add any global test cleanup here
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});