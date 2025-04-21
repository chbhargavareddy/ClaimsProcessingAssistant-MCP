import { validateClaim } from '../../../functions/claims/validate-claim';
import { createTestUser, createTestPolicy, createTestClaim } from '../../utils/factories';

// Mock validateClaimRules
jest.mock('../../../validation/claim-rules', () => ({
  validateClaimRules: jest.fn(),
}));

import { validateClaimRules } from '../../../validation/claim-rules';

describe('validateClaim', () => {
  let testUser: ReturnType<typeof createTestUser>;
  let testPolicy: ReturnType<typeof createTestPolicy>;
  let testClaim: ReturnType<typeof createTestClaim>;
  let supabase: any;

  beforeEach(() => {
    testUser = createTestUser();
    testPolicy = createTestPolicy(testUser.id);
    testClaim = createTestClaim(testUser.id, testPolicy.id);

    // Reset supabase mock
    supabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn(),
    };

    // Reset validateClaimRules mock
    (validateClaimRules as jest.Mock).mockReset();
  });

  it('should successfully validate a claim', async () => {
    // Mock successful claim fetch
    supabase.single.mockResolvedValueOnce({
      data: testClaim,
      error: null,
    });

    // Mock successful validation
    const mockValidations = [
      {
        type: 'POLICY_COVERAGE',
        result: 'PASSED',
        details: { message: 'Claim amount within policy coverage' },
      },
    ];

    (validateClaimRules as jest.Mock).mockResolvedValueOnce({
      success: true,
      validations: mockValidations,
    });

    // Mock successful validation history insert
    supabase.insert.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await validateClaim({ claimId: testClaim.id, userId: testUser.id }, supabase);

    expect(result.success).toBe(true);
    expect(result.validations).toEqual(mockValidations);
    expect(supabase.from).toHaveBeenCalledWith('claims');
    expect(supabase.eq).toHaveBeenCalledWith('id', testClaim.id);
    expect(supabase.eq).toHaveBeenCalledWith('user_id', testUser.id);
    expect(validateClaimRules).toHaveBeenCalledWith(testClaim, supabase);
  });

  it('should handle claim fetch error', async () => {
    // Mock claim fetch error
    supabase.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Claim not found'),
    });

    const result = await validateClaim({ claimId: testClaim.id, userId: testUser.id }, supabase);

    expect(result.success).toBe(false);
    expect(result.validations).toEqual([]);
    expect(result.error).toBe('Failed to fetch claim: Claim not found');
    expect(validateClaimRules).not.toHaveBeenCalled();
  });

  it('should handle validation history storage error', async () => {
    // Mock successful claim fetch
    supabase.single.mockResolvedValueOnce({
      data: testClaim,
      error: null,
    });

    // Mock successful validation with results
    const mockValidations = [
      {
        type: 'POLICY_COVERAGE',
        result: 'FAILED',
        details: { message: 'Claim amount exceeds policy coverage' },
      },
    ];

    (validateClaimRules as jest.Mock).mockResolvedValueOnce({
      success: false,
      validations: mockValidations,
    });

    // Mock validation history storage error
    supabase.insert.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    const result = await validateClaim({ claimId: testClaim.id, userId: testUser.id }, supabase);

    expect(result.success).toBe(false);
    expect(result.validations).toEqual([]);
    expect(result.error).toBe('Failed to store validation history: Database error');
  });

  it('should handle unexpected errors', async () => {
    // Mock unexpected error during claim fetch
    supabase.single.mockImplementation(() => {
      throw new Error('Network error');
    });

    const result = await validateClaim({ claimId: testClaim.id, userId: testUser.id }, supabase);

    expect(result.success).toBe(false);
    expect(result.validations).toEqual([]);
    expect(result.error).toBe('Validation error: Network error');
  });

  it('should handle non-Error objects in catch block', async () => {
    // Mock throwing a non-Error object
    supabase.single.mockImplementation(() => {
      throw 'Something went wrong';
    });

    const result = await validateClaim({ claimId: testClaim.id, userId: testUser.id }, supabase);

    expect(result.success).toBe(false);
    expect(result.validations).toEqual([]);
    expect(result.error).toBe('Validation error: Unknown error');
  });

  it('should skip validation history storage if no validations', async () => {
    // Mock successful claim fetch
    supabase.single.mockResolvedValueOnce({
      data: testClaim,
      error: null,
    });

    // Mock validation with no results
    (validateClaimRules as jest.Mock).mockResolvedValueOnce({
      success: true,
      validations: [],
    });

    const result = await validateClaim({ claimId: testClaim.id, userId: testUser.id }, supabase);

    expect(result.success).toBe(true);
    expect(result.validations).toEqual([]);
    expect(supabase.insert).not.toHaveBeenCalled();
  });
});
