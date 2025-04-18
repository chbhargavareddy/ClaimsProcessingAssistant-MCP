import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Schema for validation errors
 */
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

/**
 * Schema for validation results
 */
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  status: z.enum(['VALIDATING', 'VALIDATED', 'FAILED']).optional(),
  warnings: z.array(ValidationErrorSchema).optional(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Context object containing dependencies needed for validation
 */
export interface ClaimValidationContext {
  supabaseClient: SupabaseClient;
  userId: string;
}

/**
 * Schema for validation history entries
 */
export const ValidationHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  validated_by: z.string().uuid(),
  validation_date: z.date(),
  is_valid: z.boolean(),
  errors: z.array(ValidationErrorSchema).optional(),
  warnings: z.array(ValidationErrorSchema).optional(),
  notes: z.string().optional(),
  status: z.enum(['VALIDATING', 'VALIDATED', 'FAILED']),
});

export type ValidationHistoryEntry = z.infer<typeof ValidationHistoryEntrySchema>;

/**
 * Schema for claim data that needs validation
 */
export const ClaimDataSchema = z.object({
  policy_number: z.string(),
  claimant_name: z.string(),
  claim_type: z.string(),
  claim_amount: z.number().positive(),
  incident_date: z.string(),
  description: z.string().optional(),
  documents: z.array(z.string()),
});

export type ClaimData = z.infer<typeof ClaimDataSchema>;
