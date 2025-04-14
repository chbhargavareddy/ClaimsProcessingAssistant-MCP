import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

interface ClaimData {
  description: string;
  amount: number;
  policyId: string;
  userId: string;
}

interface SubmitClaimResponse {
  success: boolean;
  claim?: any;
  error?: string;
}

export async function submitClaim(
  data: ClaimData,
  supabase: SupabaseClient,
): Promise<SubmitClaimResponse> {
  try {
    const claim = {
      id: uuidv4(),
      claim_number: `CLM-${uuidv4().slice(0, 8)}`,
      description: data.description,
      amount: data.amount,
      policy_id: data.policyId,
      user_id: data.userId,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    const { data: insertedClaim, error } = await supabase
      .from('claims')
      .insert(claim)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to submit claim: ${error.message}`,
      };
    }

    return {
      success: true,
      claim: insertedClaim,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
} 