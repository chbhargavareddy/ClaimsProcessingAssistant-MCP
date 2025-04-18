import { SupabaseClient } from '@supabase/supabase-js';
import {
  ClaimData,
  ClaimValidationContext,
  ValidationResult,
  ValidationError,
} from '../types/validation';

interface ValidationStep {
  errors: ValidationError[];
  warnings: ValidationError[]; // Changed from optional to required
}

/**
 * Validates a claim submission against all business rules
 * @param claim The claim data to validate
 * @param context Validation context containing necessary dependencies
 * @returns ValidationResult indicating if the claim is valid and any validation errors
 */
export async function validateClaim(
  claim: ClaimData,
  context: ClaimValidationContext,
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    // Validate policy number and coverage
    const policyValidation = await validatePolicy(claim, context.supabaseClient);
    errors.push(...policyValidation.errors);
    warnings.push(...policyValidation.warnings);

    // Validate required documents
    const documentValidation = validateDocuments(claim.documents);
    errors.push(...documentValidation.errors);
    warnings.push(...(documentValidation.warnings || []));

    // Validate duplicate claims
    const duplicateValidation = await validateDuplicateClaims(claim, context.supabaseClient);
    errors.push(...duplicateValidation.errors);
    warnings.push(...duplicateValidation.warnings);

    // Validate claimant information
    const claimantValidation = validateClaimantInfo(claim);
    errors.push(...claimantValidation.errors);
    warnings.push(...(claimantValidation.warnings || []));

    // Validate claim amount
    const amountValidation = validateClaimAmount(claim);
    errors.push(...amountValidation.errors);
    warnings.push(...amountValidation.warnings);

    // Validate incident date
    const dateValidation = await validateIncidentDate(claim, context.supabaseClient);
    errors.push(...dateValidation.errors);
    warnings.push(...(dateValidation.warnings || []));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      status: errors.length === 0 ? 'VALIDATED' : 'FAILED',
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [
        {
          field: 'general',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      warnings,
      status: 'FAILED',
    };
  }
}

/**
 * Validates that the policy number exists and is valid
 */
async function validatePolicy(
  claim: ClaimData,
  supabaseClient: SupabaseClient,
): Promise<ValidationStep> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!claim.policy_number) {
    errors.push({
      field: 'policy_number',
      message: 'Policy number is required',
    });
    return { errors, warnings };
  }

  // Check if policy exists and is active
  const { data: policy } = await supabaseClient
    .from('policies')
    .select('id, coverage_amount, status')
    .eq('policy_number', claim.policy_number)
    .single();

  if (!policy) {
    errors.push({
      field: 'policy_number',
      message: `Invalid policy number: ${claim.policy_number}`,
    });
  } else if (policy.status !== 'active') {
    errors.push({
      field: 'policy_number',
      message: 'Policy is not active',
    });
  }

  return { errors, warnings };
}

/**
 * Validates that required documents are attached to the claim
 */
function validateDocuments(documents: string[]): ValidationStep {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!documents || documents.length === 0) {
    errors.push({
      field: 'documents',
      message: 'At least one document must be attached to the claim',
    });
  }

  return { errors, warnings };
}

/**
 * Checks for duplicate claims within the last 30 days
 */
async function validateDuplicateClaims(
  claim: ClaimData,
  supabaseClient: SupabaseClient,
): Promise<ValidationStep> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Check for existing claims with same policy number and incident date
  const { data: existingClaims } = await supabaseClient
    .from('claims')
    .select('id, created_at, status')
    .eq('policy_number', claim.policy_number)
    .eq('incident_date', claim.incident_date)
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (existingClaims && existingClaims.length > 0) {
    const pendingClaims = existingClaims.filter((c) => c.status === 'pending');
    const approvedClaims = existingClaims.filter((c) => c.status === 'approved');

    if (pendingClaims.length > 0) {
      warnings.push({
        field: 'general',
        message: 'There are pending claims for the same incident date',
      });
    }

    if (approvedClaims.length > 0) {
      errors.push({
        field: 'general',
        message: 'A claim for this incident has already been approved',
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validates claimant information
 */
function validateClaimantInfo(claim: ClaimData): ValidationStep {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!claim.claimant_name) {
    errors.push({
      field: 'claimant_name',
      message: 'Claimant name is required',
    });
  }

  return { errors, warnings };
}

/**
 * Validates the claim amount
 */
function validateClaimAmount(claim: ClaimData): ValidationStep {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!claim.claim_amount || claim.claim_amount <= 0) {
    errors.push({
      field: 'claim_amount',
      message: 'Claim amount must be greater than zero',
    });
  }

  if (claim.claim_amount > 100000) {
    warnings.push({
      field: 'claim_amount',
      message: 'High value claim - requires additional review',
    });
  }

  return { errors, warnings };
}

/**
 * Validates the incident date against various rules
 */
async function validateIncidentDate(
  claim: ClaimData,
  supabaseClient: SupabaseClient,
): Promise<ValidationStep> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check if date is in the future
  const incidentDate = new Date(claim.incident_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (incidentDate > today) {
    errors.push({
      field: 'incident_date',
      message: 'Incident date cannot be in the future',
    });
  }

  // Check if date is within policy coverage period
  const { data: policy } = await supabaseClient
    .from('policies')
    .select('start_date, end_date')
    .eq('policy_number', claim.policy_number)
    .single();

  if (policy) {
    const startDate = new Date(policy.start_date);
    const endDate = new Date(policy.end_date);

    if (incidentDate < startDate || incidentDate > endDate) {
      errors.push({
        field: 'incident_date',
        message: 'Incident date is outside of policy coverage period',
      });
    }
  }

  return { errors, warnings };
}
