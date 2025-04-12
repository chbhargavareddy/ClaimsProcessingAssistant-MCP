export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Claim {
  id: string;
  policy_number: string;
  claimant_name: string;
  claim_type: string;
  claim_amount: number;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
}
