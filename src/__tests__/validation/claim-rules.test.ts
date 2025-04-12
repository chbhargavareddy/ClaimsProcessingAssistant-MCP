import { validateClaim } from '../../validation/claim-validator';
import { ClaimData, ClaimValidationContext } from '../../types/validation';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Mock data
const validClaimData: ClaimData = {
  policy_number: 'POL123',
  claimant_name: 'John Doe',
  claim_type: 'medical',
  claim_amount: 1000,
  incident_date: '2024-03-20',
  documents: ['medical_report.pdf', 'invoice.pdf'],
  description: 'Medical treatment for injury'
};

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
  insert: jest.fn(),
  data: null,
  error: null
} as unknown as SupabaseClient;

const mockContext: ClaimValidationContext = {
  supabaseClient: mockSupabaseClient,
  userId: uuidv4()
};

describe('Claim Validation Rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Policy Validation', () => {
    it('should validate when policy exists and is active', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: {
          status: 'active',
          expiry_date: '2024-12-31',
          coverage_limit: 5000,
          start_date: '2024-01-01'
        },
        error: null
      });

      const result = await validateClaim(validClaimData, mockContext);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.status).toBe('VALIDATED');
    });

    // ... rest of the test cases remain the same, just change single to maybeSingle
  });
});