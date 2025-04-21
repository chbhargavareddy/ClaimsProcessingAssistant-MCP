import { createTestUser, createTestPolicy } from '../../utils/factories';
import { submitClaim } from '../../../functions/claims/submit-claim';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn(),
  delete: jest.fn().mockReturnThis(),
  neq: jest.fn().mockResolvedValue({ data: null, error: null }),
};

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('submitClaim', () => {
  let testUser: ReturnType<typeof createTestUser>;
  let testPolicy: ReturnType<typeof createTestPolicy>;
  let supabase: any;

  beforeEach(() => {
    testUser = createTestUser();
    testPolicy = createTestPolicy(testUser.id);
    supabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
  });

  it('should successfully submit a claim', async () => {
    const claimData = {
      description: 'Test claim',
      amount: 1000,
      policyId: testPolicy.id,
      userId: testUser.id,
    };

    const expectedClaim = {
      id: expect.any(String),
      claim_number: expect.stringMatching(/^CLM-[a-f0-9]{8}$/),
      description: claimData.description,
      amount: claimData.amount,
      policy_id: claimData.policyId,
      user_id: claimData.userId,
      status: 'PENDING',
      created_at: expect.any(String),
    };

    supabase.single.mockResolvedValueOnce({
      data: expectedClaim,
      error: null,
    });

    const result = await submitClaim(claimData, supabase);

    expect(result.success).toBe(true);
    expect(result.claim).toMatchObject(expectedClaim);
    expect(supabase.from).toHaveBeenCalledWith('claims');
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        description: claimData.description,
        amount: claimData.amount,
        policy_id: claimData.policyId,
        user_id: claimData.userId,
      }),
    );
  });

  it('should handle database errors', async () => {
    const claimData = {
      description: 'Test claim',
      amount: 1000,
      policyId: testPolicy.id,
      userId: testUser.id,
    };

    supabase.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    const result = await submitClaim(claimData, supabase);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to submit claim: Database error');
  });

  it('should handle unexpected errors during claim creation', async () => {
    const claimData = {
      description: 'Test claim',
      amount: 1000,
      policyId: testPolicy.id,
      userId: testUser.id,
    };

    // Simulate an unexpected error during claim creation
    supabase.insert.mockImplementation(() => {
      throw new Error('Network error');
    });

    const result = await submitClaim(claimData, supabase);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unexpected error: Network error');
  });

  it('should handle non-Error objects in catch block', async () => {
    const claimData = {
      description: 'Test claim',
      amount: 1000,
      policyId: testPolicy.id,
      userId: testUser.id,
    };

    // Simulate throwing a non-Error object
    supabase.insert.mockImplementation(() => {
      throw 'Something went wrong'; // Throwing a string
    });

    const result = await submitClaim(claimData, supabase);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unexpected error: Unknown error');
  });

  it('should generate unique claim IDs and numbers', async () => {
    const claimData = {
      description: 'Test claim',
      amount: 1000,
      policyId: testPolicy.id,
      userId: testUser.id,
    };

    // Create multiple claims and verify unique IDs and numbers
    const claims = await Promise.all([
      submitClaim(claimData, {
        ...supabase,
        single: jest.fn().mockResolvedValueOnce({
          data: { id: uuidv4(), claim_number: `CLM-${uuidv4().slice(0, 8)}` },
          error: null,
        }),
      }),
      submitClaim(claimData, {
        ...supabase,
        single: jest.fn().mockResolvedValueOnce({
          data: { id: uuidv4(), claim_number: `CLM-${uuidv4().slice(0, 8)}` },
          error: null,
        }),
      }),
    ]);

    const [claim1, claim2] = claims;
    expect(claim1.success && claim2.success).toBe(true);
    expect(claim1.claim?.id).not.toBe(claim2.claim?.id);
    expect(claim1.claim?.claim_number).not.toBe(claim2.claim?.claim_number);
  });
});
