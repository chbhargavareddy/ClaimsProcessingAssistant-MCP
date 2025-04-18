import { validateClaim } from '../../../functions/claims/validate-claim';

interface ValidateClaimParams {
  claimId: string;
  userId: string;
}

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn(),
  eq: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  neq: jest.fn().mockResolvedValue({ data: null, error: null }),
};

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Mock validateClaimRules
jest.mock('../../../validation/claim-rules', () => ({
  validateClaimRules: jest.fn().mockResolvedValue({
    success: true,
    validations: [
      {
        validation_type: 'POLICY_COVERAGE',
        validation_result: 'PASSED',
        details: { message: 'Claim amount within policy coverage' },
      },
    ],
  }),
}));

describe('validateClaim', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should validate a claim successfully', async () => {
    const claimData: ValidateClaimParams = {
      claimId: 'test-claim-id',
      userId: 'test-user-id',
    };

    // Mock successful claim fetch
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: claimData.claimId,
        user_id: claimData.userId,
        policy_id: 'test-policy-id',
        status: 'PENDING',
        claim_amount: 1000,
        policy_number: 'TEST-POL-123',
      },
      error: null,
    });

    // Mock successful validation history insert
    mockSupabase.insert.mockResolvedValueOnce({
      data: [{ id: 'test-validation-id' }],
      error: null,
    });

    const result = await validateClaim(claimData, mockSupabase as any);

    // Verify the mock was called correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('claims');
    expect(mockSupabase.select).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', claimData.claimId);
    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', claimData.userId);

    // Verify the result
    expect(result.success).toBe(true);
    expect(result.validations).toBeDefined();
    expect(result.validations.length).toBeGreaterThan(0);
  });
});
