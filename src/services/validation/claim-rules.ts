import { createClient } from '@supabase/supabase-js';
import { Claim } from '../../types/claim';
import { ValidationRule, ValidationContext, ValidationResult } from './types';

// Policy validation rule
export const policyValidationRule: ValidationRule<Claim> = {
  code: 'POLICY_VALIDATION',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validate(claim: Claim, _context: ValidationContext): Promise<ValidationResult> {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Fetch policy details
    const { data: policy, error } = await supabase
      .from('policies')
      .select('*')
      .eq('policy_number', claim.policy_number)
      .single();

    if (error || !policy) {
      return {
        isValid: false,
        errors: [
          {
            field: 'policy_number',
            message: 'Invalid or inactive policy number',
            code: 'INVALID_POLICY',
          },
        ],
        warnings: [],
      };
    }

    const errors: any[] = [];
    const warnings: any[] = [];

    // Check policy status
    if (policy.status !== 'active') {
      errors.push({
        field: 'policy_number',
        message: 'Policy is not active',
        code: 'INACTIVE_POLICY',
      });
    }

    // Check claim amount against policy coverage
    if (claim.claim_amount > policy.coverage_amount) {
      errors.push({
        field: 'claim_amount',
        message: 'Claim amount exceeds policy coverage',
        code: 'EXCEEDS_COVERAGE',
      });
    }

    // Check policy dates
    const now = new Date();
    const startDate = new Date(policy.start_date);
    const endDate = new Date(policy.end_date);

    if (now < startDate || now > endDate) {
      errors.push({
        field: 'policy_number',
        message: 'Claim date outside policy coverage period',
        code: 'OUTSIDE_COVERAGE_PERIOD',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

// Required documents validation rule
export const requiredDocumentsRule: ValidationRule<Claim> = {
  code: 'REQUIRED_DOCUMENTS',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validate(claim: Claim, _context: ValidationContext): Promise<ValidationResult> {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Fetch required document categories
    const { data: categories } = await supabase
      .from('document_categories')
      .select('*')
      .eq('required_for_claims', true);

    // Fetch submitted documents
    const { data: documents } = await supabase
      .from('documents')
      .select('*, category:document_categories(*)')
      .eq('claim_id', claim.id);

    const errors: any[] = [];
    const warnings: any[] = [];

    if (categories) {
      categories.forEach((category) => {
        const hasDocument = documents?.some((doc) => doc.category_id === category.id);
        if (!hasDocument) {
          errors.push({
            field: 'documents',
            message: `Missing required document: ${category.name}`,
            code: 'MISSING_REQUIRED_DOCUMENT',
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

// Duplicate claim check rule
export const duplicateClaimRule: ValidationRule<Claim> = {
  code: 'DUPLICATE_CLAIM',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validate(claim: Claim, _context: ValidationContext): Promise<ValidationResult> {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Look for similar claims in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: similarClaims } = await supabase
      .from('claims')
      .select('*')
      .eq('policy_number', claim.policy_number)
      .eq('claim_type', claim.claim_type)
      .eq('claim_amount', claim.claim_amount)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .neq('id', claim.id);

    const warnings = [];
    if (similarClaims && similarClaims.length > 0) {
      warnings.push({
        field: 'claim',
        message: 'Similar claim detected within the last 30 days',
        code: 'POTENTIAL_DUPLICATE',
      });
    }

    return {
      isValid: true,
      errors: [],
      warnings,
    };
  },
};
