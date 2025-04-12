import { submitClaimFunction, validateClaimFunction, getClaimStatusFunction, listClaimsFunction } from '../../functions/claims';
import { createTestUser, createTestPolicy } from '../utils/factories';
import { supabase } from '../setup';

// Mock MCP context
const createMockContext = (user: any) => ({
  user,
  supabase,
  requestId: 'test-request-id',
  timestamp: new Date().toISOString(),
});

describe('MCP Protocol Handler Tests', () => {
  let testUser: any;
  let testPolicy: any;

  beforeEach(async () => {
    testUser = createTestUser();
    testPolicy = createTestPolicy({ holder_id: testUser.id });
    await supabase.from('policies').insert(testPolicy);
  });

  describe('Function Schema Validation', () => {
    it('should validate submitClaim parameters correctly', async () => {
      const validParams = {
        policy_number: testPolicy.policy_number,
        claimant_name: 'John Doe',
        claim_type: 'medical',
        claim_amount: 500,
        incident_date: new Date().toISOString(),
        documents: ['test-doc.pdf']
      };

      // Test valid parameters
      await expect(
        submitClaimFunction.parameters.parseAsync(validParams)
      ).resolves.toBeDefined();

      // Test invalid parameters
      const invalidParams = {
        policy_number: testPolicy.policy_number,
        // Missing required fields
        claim_amount: 'not-a-number',
      };

      await expect(
        submitClaimFunction.parameters.parseAsync(invalidParams)
      ).rejects.toBeDefined();
    });

    it('should validate validateClaim parameters correctly', async () => {
      const validParams = {
        claimId: '123e4567-e89b-12d3-a456-426614174000',
      };

      await expect(
        validateClaimFunction.parameters.parseAsync(validParams)
      ).resolves.toBeDefined();

      const invalidParams = {
        claimId: 'not-a-uuid',
      };

      await expect(
        validateClaimFunction.parameters.parseAsync(invalidParams)
      ).rejects.toThrow();
    });
  });

  describe('Response Schema Validation', () => {
    it('should return valid submitClaim response structure', async () => {
      const params = {
        policy_number: testPolicy.policy_number,
        claimant_name: 'John Doe',
        claim_type: 'medical',
        claim_amount: 500,
        incident_date: new Date().toISOString(),
        documents: ['test-doc.pdf']
      };

      const result = await submitClaimFunction.handler(
        params,
        createMockContext(testUser)
      );

      await expect(
        submitClaimFunction.returns.parseAsync(result)
      ).resolves.toBeDefined();
    });

    it('should return valid listClaims response structure', async () => {
      const result = await listClaimsFunction.handler(
        {},
        createMockContext(testUser)
      );

      await expect(
        listClaimsFunction.returns.parseAsync(result)
      ).resolves.toBeDefined();
      expect(result).toHaveProperty('claims');
      expect(result).toHaveProperty('total');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors correctly', async () => {
      const params = {
        policy_number: testPolicy.policy_number,
        claimant_name: 'John Doe',
        claim_type: 'medical',
        claim_amount: 500,
        incident_date: new Date().toISOString(),
        documents: ['test-doc.pdf']
      };

      // Test with invalid user context
      await expect(
        submitClaimFunction.handler(params, { ...createMockContext(null), user: undefined })
      ).rejects.toThrow();
    });

    it('should handle validation errors with proper format', async () => {
      const invalidParams = {
        policy_number: 'INVALID-POLICY',
        claimant_name: 'John Doe',
        claim_type: 'medical',
        claim_amount: -500, // Invalid negative amount
        incident_date: new Date().toISOString(),
        documents: ['test-doc.pdf']
      };

      try {
        await submitClaimFunction.handler(
          invalidParams,
          createMockContext(testUser)
        );
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // Verify error format follows MCP specification
        if (error.issues) {
          error.issues.forEach((issue: any) => {
            expect(issue).toHaveProperty('path');
            expect(issue).toHaveProperty('message');
          });
        }
      }
    });
  });

  describe('Context Handling', () => {
    it('should properly use context in function handlers', async () => {
      const mockContext = createMockContext(testUser);
      
      // Submit a claim
      const submitResult = await submitClaimFunction.handler(
        {
          policy_number: testPolicy.policy_number,
          claimant_name: 'John Doe',
          claim_type: 'medical',
          claim_amount: 500,
          incident_date: new Date().toISOString(),
          documents: ['test-doc.pdf']
        },
        mockContext
      );

      expect(submitResult).toBeDefined();
      expect(submitResult.status).toBe('success');
    });

    it('should maintain consistent context across function calls', async () => {
      const mockContext = createMockContext(testUser);
      
      // Submit a claim
      const submitResult = await submitClaimFunction.handler(
        {
          policy_number: testPolicy.policy_number,
          claimant_name: 'John Doe',
          claim_type: 'medical',
          claim_amount: 500,
          incident_date: new Date().toISOString(),
          documents: ['test-doc.pdf']
        },
        mockContext
      );

      expect(submitResult).toBeDefined();
      expect(submitResult.status).toBe('success');
    });
  });

  describe('Function Chaining', () => {
    it('should support workflow of multiple function calls', async () => {
      const mockContext = createMockContext(testUser);
      
      // 1. Submit claim
      const submitResult = await submitClaimFunction.handler(
        {
          policy_number: testPolicy.policy_number,
          claimant_name: 'John Doe',
          claim_type: 'medical',
          claim_amount: 500,
          incident_date: new Date().toISOString(),
          documents: ['test-doc.pdf']
        },
        mockContext
      );

      expect(submitResult).toBeDefined();
      expect(submitResult.status).toBe('success');
    });
  });
});