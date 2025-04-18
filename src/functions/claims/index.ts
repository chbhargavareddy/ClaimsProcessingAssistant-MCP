import { z } from 'zod';
import { ClaimProcessor } from '../../services/claims/processor';
import {
  SubmitClaimDtoSchema,
  ListClaimsFilterDtoSchema,
  ClaimResponseDtoSchema,
} from '../../types/claim';

const processor = new ClaimProcessor();

// Submit Claim Function
export const submitClaimFunction = {
  name: 'submitClaim',
  description: 'Submit a new insurance claim',
  parameters: SubmitClaimDtoSchema,
  returns: z.object({
    claim: ClaimResponseDtoSchema,
    status: z.string(),
    message: z.string(),
  }),
  async handler(params: z.infer<typeof SubmitClaimDtoSchema>, context: any) {
    const { claim, workflowResult } = await processor.submitClaim(params, context.user.id);

    return {
      claim,
      status: workflowResult.success ? 'success' : 'error',
      message: workflowResult.success
        ? 'Claim submitted successfully'
        : workflowResult.error?.message || 'Failed to submit claim',
    };
  },
};

// Validate Claim Function
export const validateClaimFunction = {
  name: 'validateClaim',
  description: 'Validate an existing claim',
  parameters: z.object({
    claimId: z.string().uuid(),
  }),
  returns: z.object({
    isValid: z.boolean(),
    errors: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
    warnings: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
    status: z.string(),
  }),
  async handler(params: { claimId: string }, context: any) {
    const { validationResult, workflowResult } = await processor.validateClaim(
      params.claimId,
      context.user.id,
    );

    return {
      ...validationResult,
      status: workflowResult.newState || 'unknown',
    };
  },
};

// Get Claim Status Function
export const getClaimStatusFunction = {
  name: 'getClaimStatus',
  description: 'Get the current status of a claim',
  parameters: z.object({
    claimId: z.string().uuid(),
  }),
  returns: z.object({
    claim: ClaimResponseDtoSchema,
    validationHistory: z
      .array(
        z.object({
          timestamp: z.string(),
          isValid: z.boolean(),
          errors: z
            .array(
              z.object({
                field: z.string(),
                message: z.string(),
              }),
            )
            .optional(),
          warnings: z
            .array(
              z.object({
                field: z.string(),
                message: z.string(),
              }),
            )
            .optional(),
        }),
      )
      .optional(),
    documents: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          status: z.string(),
          uploaded_at: z.string(),
        }),
      )
      .optional(),
  }),
  async handler(params: { claimId: string }, context: any) {
    const { data: claim, error } = await context.supabase
      .from('claims')
      .select(
        `
        *,
        validation_history (
          id,
          is_valid,
          errors,
          warnings,
          validated_at
        ),
        documents (
          id,
          type,
          status,
          uploaded_at
        )
      `,
      )
      .eq('id', params.claimId)
      .single();

    if (error || !claim) {
      throw new Error('Claim not found');
    }

    return {
      claim,
      validationHistory: claim.validation_history,
      documents: claim.documents,
    };
  },
};

// List Claims Function
export const listClaimsFunction = {
  name: 'listClaims',
  description: 'List and filter claims',
  parameters: ListClaimsFilterDtoSchema,
  returns: z.object({
    claims: z.array(ClaimResponseDtoSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
  async handler(params: z.infer<typeof ListClaimsFilterDtoSchema>, context: any) {
    let query = context.supabase.from('claims').select('*', { count: 'exact' });

    // Apply filters
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.claim_type) {
      query = query.eq('claim_type', params.claim_type);
    }
    if (params.from_date) {
      query = query.gte('created_at', params.from_date);
    }
    if (params.to_date) {
      query = query.lte('created_at', params.to_date);
    }
    if (params.min_amount) {
      query = query.gte('claim_amount', params.min_amount);
    }
    if (params.max_amount) {
      query = query.lte('claim_amount', params.max_amount);
    }
    if (params.policy_number) {
      query = query.eq('policy_number', params.policy_number);
    }
    if (params.claimant_name) {
      query = query.ilike('claimant_name', `%${params.claimant_name}%`);
    }

    // Add pagination
    const page = params.page || 1;
    const pageSize = params.limit || 10;
    const offset = (page - 1) * pageSize;

    query = query.range(offset, offset + pageSize - 1).order('created_at', { ascending: false });

    const { data: claims, count, error } = await query;

    if (error) {
      throw error;
    }

    return {
      claims: claims || [],
      total: count || 0,
      page,
      pageSize,
    };
  },
};
