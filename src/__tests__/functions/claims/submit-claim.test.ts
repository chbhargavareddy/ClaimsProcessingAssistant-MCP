import { submitClaimFunction } from '../../../functions/claims';
import { createTestUser, createTestPolicy } from '../../utils/factories';
import { supabase } from '../../setup';

describe('submitClaim', () => {
  let testUser: any;
  let testPolicy: any;

  beforeEach(async () => {
    // Create test user and policy
    testUser = createTestUser();
    testPolicy = createTestPolicy({ holder_id: testUser.id });

    // Insert test policy
    await supabase.from('policies').insert(testPolicy);
  });

  it('should successfully submit a valid claim', async () => {
    const claimData = {
      policy_number: testPolicy.policy_number,
      claimant_name: 'John Doe',
      claim_type: 'medical',
      claim_amount: 500,
      incident_date: new Date().toISOString(),
      documents: ['test-doc.pdf'],
      description: 'Test claim'
    };

    const result = await submitClaimFunction.handler(claimData, {
      user: testUser,
      supabase
    });

    expect(result.claim).toBeDefined();
    expect(result.claim.policy_number).toBe(testPolicy.policy_number);
    expect(result.claim.status).toBe('pending');
  });

  it('should reject claim submission with invalid policy number', async () => {
    const claimData = {
      policy_number: 'INVALID-POLICY',
      claimant_name: 'John Doe',
      claim_type: 'medical',
      claim_amount: 500,
      incident_date: new Date().toISOString(),
      documents: ['test-doc.pdf']
    };

    await expect(
      submitClaimFunction.handler(claimData, {
        user: testUser,
        supabase
      })
    ).rejects.toThrow();
  });

  it('should reject claim submission with amount exceeding coverage', async () => {
    const claimData = {
      policy_number: testPolicy.policy_number,
      claimant_name: 'John Doe',
      claim_type: 'medical',
      claim_amount: testPolicy.coverage_amount + 1000,
      incident_date: new Date().toISOString(),
      documents: ['test-doc.pdf']
    };

    await expect(
      submitClaimFunction.handler(claimData, {
        user: testUser,
        supabase
      })
    ).rejects.toThrow();
  });

  it('should create audit trail entry on successful submission', async () => {
    const claimData = {
      policy_number: testPolicy.policy_number,
      claimant_name: 'John Doe',
      claim_type: 'medical',
      claim_amount: 500,
      incident_date: new Date().toISOString(),
      documents: ['test-doc.pdf']
    };

    const result = await submitClaimFunction.handler(claimData, {
      user: testUser,
      supabase
    });

    expect(result.claim).toBeDefined();
    expect(result.claim.id).toBeDefined();

    const { data: auditEntries } = await supabase
      .from('audit_trail')
      .select('*')
      .eq('claim_id', result.claim.id);

    expect(auditEntries).toHaveLength(1);
    expect(auditEntries![0].action).toBe('CLAIM_SUBMITTED');
  });

  it('should reject claim submission without required description', async () => {
    const claimData = {
      policy_number: testPolicy.policy_number,
      claimant_name: 'John Doe',
      claim_type: 'medical',
      claim_amount: 500,
      incident_date: new Date().toISOString(),
      documents: ['test-doc.pdf']
      // description intentionally omitted
    };

    await expect(
      submitClaimFunction.handler(claimData, {
        user: testUser,
        supabase
      })
    ).rejects.toThrow('Description is required');
  });

  it('should reject claim submission with description exceeding maximum length', async () => {
    const claimData = {
      policy_number: testPolicy.policy_number,
      claimant_name: 'John Doe',
      claim_type: 'medical',
      claim_amount: 500,
      incident_date: new Date().toISOString(),
      documents: ['test-doc.pdf'],
      description: 'a'.repeat(1001) // Exceeds 1000 character limit
    };

    await expect(
      submitClaimFunction.handler(claimData, {
        user: testUser,
        supabase
      })
    ).rejects.toThrow('Description must not exceed 1000 characters');
  });
});