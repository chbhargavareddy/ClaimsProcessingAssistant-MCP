import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });

import { createTestUser, createTestPolicy } from '../../utils/factories';
import { submitClaim } from '../../../functions/claims/submit-claim';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

describe('submitClaim', () => {
  let testUser: any;
  let testPolicy: any;

  beforeEach(async () => {
    try {
      // Create test user
      const testUserData = createTestUser();
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert(testUserData)
        .select()
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('Failed to create test user');
      testUser = userData;

      // Create test policy with string ID
      const testPolicyData = createTestPolicy(testUser.id);
      const { data: policyData, error: policyError } = await supabase
        .from('policies')
        .insert(testPolicyData)
        .select()
        .single();

      if (policyError) throw policyError;
      if (!policyData) throw new Error('Failed to create test policy');
      testPolicy = policyData;
    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      await supabase.from('claims').delete().neq('id', '');
      await supabase.from('policies').delete().neq('id', '');
      await supabase.from('users').delete().neq('id', '');
    } catch (error) {
      console.error('Test cleanup failed:', error);
    }
  });

  it('should submit a new claim', async () => {
    const claimData = {
      description: 'Test claim',
      amount: 1000,
      policyId: testPolicy.id,
      userId: testUser.id,
    };

    const result = await submitClaim(claimData, supabase);
    expect(result.success).toBe(true);
    expect(result.claim).toMatchObject({
      description: claimData.description,
      amount: claimData.amount,
      policy_id: claimData.policyId,
      user_id: claimData.userId,
      status: 'PENDING',
    });
  });
});
