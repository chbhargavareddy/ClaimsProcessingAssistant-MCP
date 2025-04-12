import { validateClaimFunction } from '../../../functions/claims';
import { createTestUser, createTestClaim, createTestPolicy } from '../../utils/factories';
import { supabase } from '../../setup';

describe('validateClaim', () => {
  let testUser: any;
  let testPolicy: any;
  let testClaim: any;

  beforeEach(async () => {
    // Create test user and policy
    testUser = createTestUser();
    testPolicy = createTestPolicy({ holder_id: testUser.id });

    // Insert test policy
    await supabase.from('policies').insert(testPolicy);

    // Create and insert test claim
    testClaim = createTestClaim({
      policy_number: testPolicy.policy_number,
      claimant_name: testUser.name || 'Test User',
      claim_amount: testPolicy.coverage_amount / 2, // Valid amount
      incident_date: new Date().toISOString(),
      documents: ['test-doc.pdf']
    });

    await supabase.from('claims').insert(testClaim);
  });

  it('should successfully validate a valid claim', async () => {
    const result = await validateClaimFunction.handler(
      { claimId: testClaim.id },
      { user: testUser, supabase }
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.status).toBe('VALIDATING');
  });

  it('should fail validation for claim exceeding policy coverage', async () => {
    // Update claim amount to exceed coverage
    await supabase
      .from('claims')
      .update({ claim_amount: testPolicy.coverage_amount + 1000 })
      .eq('id', testClaim.id);

    const result = await validateClaimFunction.handler(
      { claimId: testClaim.id },
      { user: testUser, supabase }
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'claim_amount',
        message: expect.stringContaining('exceeds policy coverage')
      })
    );
  });

  it('should fail validation for expired policy', async () => {
    // Update policy to be expired
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    
    await supabase
      .from('policies')
      .update({
        end_date: pastDate.toISOString()
      })
      .eq('id', testPolicy.id);

    const result = await validateClaimFunction.handler(
      { claimId: testClaim.id },
      { user: testUser, supabase }
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'policy_number',
        message: expect.stringContaining('outside policy coverage period')
      })
    );
  });

  it('should create validation history entry', async () => {
    await validateClaimFunction.handler(
      { claimId: testClaim.id },
      { user: testUser, supabase }
    );

    const { data: validationHistory } = await supabase
      .from('validation_history')
      .select('*')
      .eq('claim_id', testClaim.id);

    expect(validationHistory).toHaveLength(1);
    expect(validationHistory![0].validated_by).toBe(testUser.id);
  });

  it('should handle non-existent claim', async () => {
    await expect(
      validateClaimFunction.handler(
        { claimId: '00000000-0000-0000-0000-000000000000' },
        { user: testUser, supabase }
      )
    ).rejects.toThrow('Claim not found');
  });

  it('should fail validation for missing required documents', async () => {
    // Update claim to have no documents
    await supabase
      .from('claims')
      .update({ documents: [] })
      .eq('id', testClaim.id);

    const result = await validateClaimFunction.handler(
      { claimId: testClaim.id },
      { user: testUser, supabase }
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'documents',
        message: expect.stringContaining('required documents')
      })
    );
  });

  it('should fail validation for future incident date', async () => {
    // Set incident date to future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    await supabase
      .from('claims')
      .update({
        incident_date: futureDate.toISOString()
      })
      .eq('id', testClaim.id);

    const result = await validateClaimFunction.handler(
      { claimId: testClaim.id },
      { user: testUser, supabase }
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'incident_date',
        message: expect.stringContaining('cannot be in the future')
      })
    );
  });

  it('should validate claim with all required fields and valid data', async () => {
    // Update claim with complete valid data
    await supabase
      .from('claims')
      .update({
        description: 'Valid claim description',
        incident_location: 'Test Location',
        documents: ['medical-report.pdf', 'incident-photos.jpg'],
        claim_type: 'MEDICAL'
      })
      .eq('id', testClaim.id);

    const result = await validateClaimFunction.handler(
      { claimId: testClaim.id },
      { user: testUser, supabase }
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.status).toBe('VALIDATING');
    expect(result.validatedFields).toEqual(
      expect.arrayContaining([
        'claim_amount',
        'incident_date',
        'documents',
        'description',
        'incident_location',
        'claim_type'
      ])
    );
  });
});