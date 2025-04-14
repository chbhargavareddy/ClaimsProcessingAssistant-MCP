export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Claim {
  id: string;
  policy_number: string;
  claimant_name: string;
  claim_type: string;
  claim_amount: number;
  incident_date: string;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
  documents?: string[];
  description?: string;
}

// Import Zod for runtime validation
import { z } from 'zod';

// DTO for submitting a new claim
export const SubmitClaimDtoSchema = z.object({
  policy_number: z.string().min(1),
  claimant_name: z.string().min(1),
  claim_type: z.string().min(1),
  claim_amount: z.number().positive(),
  incident_date: z.string(),
  documents: z.array(z.string()),
  description: z.string().optional(),
});

export type SubmitClaimDto = z.infer<typeof SubmitClaimDtoSchema>;

// DTO for filtering claims in list operations
export const ListClaimsFilterDtoSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  claim_type: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  min_amount: z.number().optional(),
  max_amount: z.number().optional(),
  policy_number: z.string().optional(),
  claimant_name: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

export type ListClaimsFilterDto = z.infer<typeof ListClaimsFilterDtoSchema>;

// DTO for claim validation response
export const ClaimValidationResultDtoSchema = z.object({
  is_valid: z.boolean(),
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
});

export type ClaimValidationResultDto = z.infer<typeof ClaimValidationResultDtoSchema>;

// DTO for claim response
export const ClaimResponseDtoSchema = z.object({
  id: z.string(),
  policy_number: z.string(),
  claimant_name: z.string(),
  claim_type: z.string(),
  claim_amount: z.number(),
  incident_date: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  description: z.string().optional(),
  documents: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  processed_by: z.string().optional(),
  processed_at: z.string().optional(),
});
