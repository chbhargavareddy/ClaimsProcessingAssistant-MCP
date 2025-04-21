import { SupabaseClient } from '@supabase/supabase-js';
import { validateClaimRules } from '../../validation/claim-rules';

interface ValidateClaimParams {
  claimId: string;
  userId: string;
}

interface ValidateClaimResponse {
  success: boolean;
  validations: any[];
  error?: string;
}

export async function validateClaim(
  params: ValidateClaimParams,
  supabase: SupabaseClient,
): Promise<ValidateClaimResponse> {
  try {
    // Fetch claim details
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select()
      .eq('id', params.claimId)
      .eq('user_id', params.userId)
      .single();

    if (claimError) {
      return {
        success: false,
        validations: [],
        error: `Failed to fetch claim: ${claimError.message}`,
      };
    }

    // Validate claim rules
    const validationResult = await validateClaimRules(claim, supabase);

    // If there's an error from validation rules, return it immediately
    if (validationResult.error) {
      return {
        success: false,
        validations: [],
        error: validationResult.error,
      };
    }

    // Store validation history
    if (validationResult.validations.length > 0) {
      const { error: historyError } = await supabase.from('validation_history').insert(
        validationResult.validations.map((validation) => ({
          claim_id: params.claimId,
          ...validation,
          created_at: new Date().toISOString(),
        })),
      );

      if (historyError) {
        return {
          success: false,
          validations: [],
          error: `Failed to store validation history: ${historyError.message}`,
        };
      }
    }

    return {
      success: validationResult.success,
      validations: validationResult.validations,
    };
  } catch (error) {
    return {
      success: false,
      validations: [],
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
