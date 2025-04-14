import { validateClaimRules } from '../../validation/claim-rules';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('Claim Rules Validation', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('should validate claim amount against policy coverage', async () => {
    const testClaim = {
      id: 'test-claim-id',
      amount: 5000,
      policy_id: 'test-policy-id',
    };

    const testPolicy = {
      id: 'test-policy-id',
      coverage_amount: 10000,
      status: 'ACTIVE',
    };

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: testPolicy,
      error: null,
    });

    const result = await validateClaimRules(testClaim, mockSupabaseClient);

    expect(result.success).toBe(true);
    expect(result.validations).toHaveLength(1);
    expect(result.validations[0]).toMatchObject({
      validation_type: 'POLICY_COVERAGE',
      validation_result: 'PASSED',
    });
  });

  it('should fail validation if claim amount exceeds coverage', async () => {
    const testClaim = {
      id: 'test-claim-id',
      amount: 15000,
      policy_id: 'test-policy-id',
    };

    const testPolicy = {
      id: 'test-policy-id',
      coverage_amount: 10000,
      status: 'ACTIVE',
    };

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: testPolicy,
      error: null,
    });

    const result = await validateClaimRules(testClaim, mockSupabaseClient);

    expect(result.success).toBe(false);
    expect(result.validations).toHaveLength(1);
    expect(result.validations[0]).toMatchObject({
      validation_type: 'POLICY_COVERAGE',
      validation_result: 'FAILED',
    });
  });
});
