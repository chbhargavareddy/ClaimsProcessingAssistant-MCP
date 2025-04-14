import { createClient } from '@supabase/supabase-js';
import {
  createTestUser,
  createTestPolicy,
  createTestClaim,
  createTestValidationHistory,
  cleanupTestData,
} from '../utils/factories';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

enum ClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

describe('Supabase Integration Tests', () => {
  let testUser: { id: string; email: string };
  let testPolicy: { id: string };
  let testClaim: { id: string };

  beforeAll(async () => {
    await cleanupTestData(supabase);
  });

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
      testUser = userData;

      // Create test policy using string ID
      const testPolicyData = createTestPolicy(testUser.id);
      const { data: policyData, error: policyError } = await supabase
        .from('policies')
        .insert(testPolicyData)
        .select()
        .single();

      if (policyError) throw policyError;
      testPolicy = policyData;

      // Create test claim with both required parameters
      const testClaimData = createTestClaim(testUser.id, testPolicy.id);
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .insert(testClaimData)
        .select()
        .single();

      if (claimError) throw claimError;
      testClaim = claimData;
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  afterEach(async () => {
    await cleanupTestData(supabase);
  });

  describe('Claims Management', () => {
    it('should create and retrieve a claim', async () => {
      try {
        const newClaim = createTestClaim(testUser.id, testPolicy.id);
        const { data: insertedClaim, error: insertError } = await supabase
          .from('claims')
          .insert(newClaim)
          .select()
          .single();

        expect(insertError).toBeNull();
        expect(insertedClaim).toBeTruthy();

        if (insertedClaim) {
          expect(insertedClaim.user_id).toBe(testUser.id);
          expect(insertedClaim.policy_id).toBe(testPolicy.id);
          expect(insertedClaim.status).toBe(ClaimStatus.PENDING);
        }
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('Validation History', () => {
    it('should create validation record', async () => {
      try {
        const validationRecord = createTestValidationHistory(testClaim.id);
        const { data, error } = await supabase
          .from('validation_history')
          .insert(validationRecord)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeTruthy();
        if (data) {
          expect(data.claim_id).toBe(testClaim.id);
        }
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });
});
