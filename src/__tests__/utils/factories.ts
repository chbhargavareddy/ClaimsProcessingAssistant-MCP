import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';

interface TestUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface TestPolicy {
  id: string;
  policy_number: string;
  holder_id: string;
  coverage_amount: number;
  coverage_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface TestClaim {
  id: string;
  claim_number: string;
  user_id: string;
  policy_id: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
}

interface TestValidationHistory {
  id: string;
  claim_id: string;
  validation_type: string;
  validation_result: string;
  details: Record<string, string | number | boolean>;
  created_at: string;
}

export const createTestUser = (): TestUser => ({
  id: uuidv4(),
  email: `test-${uuidv4()}@example.com`,
  name: 'Test User',
  created_at: new Date().toISOString(),
});

export const createTestPolicy = (holderId: string): TestPolicy => ({
  id: uuidv4(),
  policy_number: `POL-${uuidv4().slice(0, 8)}`,
  holder_id: holderId,
  coverage_amount: 10000,
  coverage_type: 'HEALTH',
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'ACTIVE',
  created_at: new Date().toISOString(),
});

export const createTestClaim = (userId: string, policyId: string): TestClaim => ({
  id: uuidv4(),
  claim_number: `CLM-${uuidv4().slice(0, 8)}`,
  user_id: userId,
  policy_id: policyId,
  description: 'Test claim description',
  amount: 1000,
  status: 'PENDING',
  created_at: new Date().toISOString(),
});

export const createTestValidationHistory = (claimId: string): TestValidationHistory => ({
  id: uuidv4(),
  claim_id: claimId,
  validation_type: 'POLICY_COVERAGE',
  validation_result: 'PASSED',
  details: { message: 'Claim amount within policy coverage' },
  created_at: new Date().toISOString(),
});

export const cleanupTestData = async (supabase: SupabaseClient): Promise<void> => {
  try {
    // Delete in reverse order of dependencies
    await supabase.from('validation_history').delete().neq('id', '');
    await supabase.from('claims').delete().neq('id', '');
    await supabase.from('policies').delete().neq('id', '');
    await supabase.from('users').delete().neq('id', '');
  } catch (error) {
    throw new Error(`Cleanup failed: ${error}`);
  }
};
