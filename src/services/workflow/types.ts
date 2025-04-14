import { Claim } from '../../types/claim';

export type ClaimAction = 
  | 'SUBMIT'
  | 'START_REVIEW'
  | 'REQUEST_DOCUMENTS'
  | 'PROVIDE_DOCUMENTS'
  | 'VALIDATE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL';

export type ClaimState = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PENDING_DOCUMENTS'
  | 'VALIDATING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface StateTransition {
  fromState: ClaimState;
  action: ClaimAction;
  toState: ClaimState;
  conditions?: (claim: Claim) => Promise<boolean>;
  sideEffects?: (claim: Claim) => Promise<void>;
}

export interface WorkflowContext {
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WorkflowError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface WorkflowResult {
  success: boolean;
  newState?: ClaimState;
  error?: WorkflowError;
  metadata?: Record<string, unknown>;
}