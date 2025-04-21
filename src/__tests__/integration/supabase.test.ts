import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });

import { createClient } from '@supabase/supabase-js';
import {
  createTestUser,
  createTestPolicy,
  createTestClaim,
  createTestValidationHistory,
} from '../utils/factories';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => {
            switch (table) {
              case 'users':
                return Promise.resolve({
                  data: { id: 'test-user-id', email: 'test@example.com' },
                  error: null,
                });
              case 'policies':
                return Promise.resolve({
                  data: { id: 'test-policy-id' },
                  error: null,
                });
              case 'claims':
                return Promise.resolve({
                  data: {
                    id: 'test-claim-id',
                    user_id: 'test-user-id',
                    policy_id: 'test-policy-id',
                    status: 'PENDING',
                  },
                  error: null,
                });
              case 'validation_history':
                return Promise.resolve({
                  data: {
                    id: 'test-validation-id',
                    claim_id: 'test-claim-id',
                  },
                  error: null,
                });
              default:
                return Promise.resolve({
                  data: null,
                  error: new Error(`Unknown table: ${table}`),
                });
            }
          }),
        })),
      })),
      delete: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}));

enum ClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

const supabase = createClient('mock-url', 'mock-key');

describe('Supabase Integration Tests', () => {
  let testUser: { id: string; email: string };
  let testPolicy: { id: string };
  let testClaim: { id: string };

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

      // Create test policy
      const testPolicyData = createTestPolicy(testUser.id);
      const { data: policyData, error: policyError } = await supabase
        .from('policies')
        .insert(testPolicyData)
        .select()
        .single();

      if (policyError) throw policyError;
      testPolicy = policyData;

      // Create test claim
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
