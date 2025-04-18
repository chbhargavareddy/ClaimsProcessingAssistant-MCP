/* eslint-disable @typescript-eslint/no-unused-vars */
import { SupabaseClient } from '@supabase/supabase-js';
import { validateClaim } from '../validation/claim-validator';
import { ClaimData } from '../types/validation';
import { z } from 'zod';
import {
  analyzeClaimHandler,
  validateDocumentsHandler,
  AnalyzeClaimSchema,
  ValidateDocumentsSchema,
} from '../mcp/functions/claim-analysis';

export interface ClaimFunction {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  returns: z.ZodObject<any>;
  handler: (params: any, context: { user: any; supabase: SupabaseClient }) => Promise<any>;
}

const ClaimParamsSchema = z.object({
  policy_number: z.string(),
  claimant_name: z.string(),
  claim_type: z.string(),
  claim_amount: z.number(),
  incident_date: z.string(),
  documents: z.array(z.string()),
});

const ClaimResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  created_at: z.string(),
});

export const submitClaimFunction: ClaimFunction = {
  name: 'submitClaim',
  description: 'Submit a new claim for processing',
  parameters: ClaimParamsSchema,
  returns: ClaimResponseSchema,
  handler: async (params, context) => {
    // Implementation will be added later
    return {
      id: 'test-id',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
  },
};

const ValidateClaimParamsSchema = z.object({
  claimId: z.string(),
});

const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
    }),
  ),
  status: z.enum(['VALIDATING', 'VALIDATED', 'FAILED']),
});

export const validateClaimFunction: ClaimFunction = {
  name: 'validateClaim',
  description: 'Validate a claim against business rules',
  parameters: ValidateClaimParamsSchema,
  returns: ValidationResultSchema,
  handler: async (params, context) => {
    const { claimId } = params;
    const { user, supabase } = context;

    // Get claim data
    const { data: claim, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !claim) {
      throw new Error('Claim not found');
    }

    // Convert to ClaimData format
    const claimData: ClaimData = {
      policy_number: claim.policy_number,
      claimant_name: claim.claimant_name,
      claim_type: claim.claim_type,
      claim_amount: claim.claim_amount,
      incident_date: claim.incident_date,
      documents: claim.documents || [],
    };

    // Validate claim
    const validationResult = await validateClaim(claimData, {
      supabaseClient: supabase,
      userId: user.id,
    });

    // Create validation history entry
    await supabase.from('validation_history').insert({
      claim_id: claimId,
      validated_by: user.id,
      validation_date: new Date().toISOString(),
      is_valid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      status: validationResult.status,
    });

    return validationResult;
  },
};

const ClaimStatusParamsSchema = z.object({
  claimId: z.string(),
});

const ClaimStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  updated_at: z.string(),
});

export const getClaimStatusFunction: ClaimFunction = {
  name: 'getClaimStatus',
  description: 'Get the current status of a claim',
  parameters: ClaimStatusParamsSchema,
  returns: ClaimStatusSchema,
  handler: async (params, context) => {
    // Implementation will be added later
    return {
      status: 'pending',
      updated_at: new Date().toISOString(),
    };
  },
};

const ListClaimsParamsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

const ListClaimsResponseSchema = z.object({
  claims: z.array(ClaimResponseSchema),
  total: z.number(),
});

export const listClaimsFunction: ClaimFunction = {
  name: 'listClaims',
  description: 'List claims with optional filters',
  parameters: ListClaimsParamsSchema,
  returns: ListClaimsResponseSchema,
  handler: async (params, context) => {
    // Implementation will be added later
    return {
      claims: [],
      total: 0,
    };
  },
};

export const analyzeClaimWithAIFunction: ClaimFunction = {
  name: 'analyzeClaimWithAI',
  description: 'Analyze a claim using Claude AI for advanced insights',
  parameters: AnalyzeClaimSchema,
  returns: z.object({
    analysis: z.string(),
    timestamp: z.string(),
  }),
  handler: async (params, _context) => {
    return await analyzeClaimHandler(params);
  },
};

export const validateDocumentsWithAIFunction: ClaimFunction = {
  name: 'validateDocumentsWithAI',
  description: 'Validate claim documents using Claude AI for completeness and consistency',
  parameters: ValidateDocumentsSchema,
  returns: z.object({
    validation: z.string(),
    timestamp: z.string(),
  }),
  handler: async (params, _context) => {
    return await validateDocumentsHandler(params);
  },
};
