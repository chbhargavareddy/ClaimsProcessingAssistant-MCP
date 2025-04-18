import { createTestUser, createTestPolicy } from '../../utils/factories';
import { submitClaim } from '../../../functions/claims/submit-claim';

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
  let testUser: any;
  let testPolicy: any;

  beforeEach(() => {
    // Reset mock data
    testUser = createTestUser();
    testPolicy = createTestPolicy(testUser.id);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should submit a new claim', async () => {
    const claimData = {
      description: 'Test claim',
      amount: 1000,
      policyId: testPolicy.id,
      userId: testUser.id,
    };

    // Mock the insert and select chain for claim creation
    mockSupabase.insert.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'test-claim-id',
        description: claimData.description,
        amount: claimData.amount,
        policy_id: claimData.policyId,
        user_id: claimData.userId,
        status: 'PENDING',
      },
      error: null,
    });

    const result = await submitClaim(claimData, mockSupabase as any);

    // Verify the mock was called correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('claims');
    expect(mockSupabase.insert).toHaveBeenCalled();
    expect(mockSupabase.select).toHaveBeenCalled();

    // Verify the result
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
