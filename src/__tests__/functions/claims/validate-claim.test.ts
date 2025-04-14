import { createTestUser, createTestPolicy, createTestClaim } from '../../utils/factories';
import { validateClaim } from '../../../functions/claims/validate-claim';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

describe('validateClaim', () => {
  let testUser: any;
  let testPolicy: any;
  let testClaim: any;

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

      // Create test claim with both required parameters
      const testClaimData = createTestClaim(testUser.id, testPolicy.id);
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .insert(testClaimData)
        .select()
        .single();

      if (claimError) throw claimError;
      if (!claimData) throw new Error('Failed to create test claim');
      testClaim = claimData;
    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      await supabase.from('validation_history').delete().neq('id', '');
      await supabase.from('claims').delete().neq('id', '');
      await supabase.from('policies').delete().neq('id', '');
      await supabase.from('users').delete().neq('id', '');
    } catch (error) {
      console.error('Test cleanup failed:', error);
    }
  });

  it('should validate a claim', async () => {
    const result = await validateClaim(
      {
        claimId: testClaim.id,
        userId: testUser.id,
      },
      supabase,
    );

    expect(result.success).toBe(true);
    expect(result.validations).toHaveLength(1);
    expect(result.validations[0]).toMatchObject({
      validation_type: 'POLICY_COVERAGE',
      validation_result: 'PASSED',
    });
  });
});
