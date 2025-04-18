import { SupabaseClient } from '@supabase/supabase-js';

interface Claim {
  id: string;
  amount: number;
  policy_id: string;
}

interface Policy {
  id: string;
  coverage_amount: number;
  status: string;
}

interface ValidationResult {
  validation_type: string;
  validation_result: string;
  details?: Record<string, any>;
}

interface ValidationResponse {
  success: boolean;
  validations: ValidationResult[];
  error?: string;
}

export async function validateClaimRules(
  claim: Claim,
  supabase: SupabaseClient,
): Promise<ValidationResponse> {
  try {
    // Fetch policy details
    const { data: policy, error: policyError } = await supabase
      .from('policies')
      .select()
      .eq('id', claim.policy_id)
      .single();

    if (policyError) {
      return {
        success: false,
        validations: [],
        error: `Failed to fetch policy: ${policyError.message}`,
      };
    }

    const validations: ValidationResult[] = [];

    // Validate claim amount against policy coverage
    const coverageValidation = validateCoverage(claim, policy);
    validations.push(coverageValidation);

    // Determine overall success
    const success = validations.every((v) => v.validation_result === 'PASSED');

    return {
      success,
      validations,
    };
  } catch (error) {
    return {
      success: false,
      validations: [],
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

function validateCoverage(claim: Claim, policy: Policy): ValidationResult {
  if (claim.amount <= policy.coverage_amount && policy.status === 'ACTIVE') {
    return {
      validation_type: 'POLICY_COVERAGE',
      validation_result: 'PASSED',
      details: {
        message: 'Claim amount within policy coverage',
        claim_amount: claim.amount,
        coverage_amount: policy.coverage_amount,
      },
    };
  }

  return {
    validation_type: 'POLICY_COVERAGE',
    validation_result: 'FAILED',
    details: {
      message:
        claim.amount > policy.coverage_amount
          ? 'Claim amount exceeds policy coverage'
          : 'Policy is not active',
      claim_amount: claim.amount,
      coverage_amount: policy.coverage_amount,
      policy_status: policy.status,
    },
  };
}
