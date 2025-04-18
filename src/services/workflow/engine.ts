import { createClient } from '@supabase/supabase-js';
import {
  ClaimState,
  ClaimAction,
  StateTransition,
  WorkflowContext,
  WorkflowResult,
  WorkflowError,
} from './types';
import { Claim, ClaimStatus } from '../../types/claim';

export class ClaimWorkflowEngine {
  private transitions: StateTransition[] = [];
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  constructor() {
    this.initializeTransitions();
  }

  private initializeTransitions() {
    // Define all possible state transitions
    this.transitions = [
      // Submit new claim
      {
        fromState: 'DRAFT',
        action: 'SUBMIT',
        toState: 'SUBMITTED',
        conditions: async (claim) => {
          // Check if all required fields are present
          return !!(claim.policy_number && claim.claimant_name && claim.claim_amount);
        },
        sideEffects: async (claim) => {
          // Create audit trail entry
          await this.createAuditEntry(claim, 'CLAIM_SUBMITTED');
        },
      },
      // Start review process
      {
        fromState: 'SUBMITTED',
        action: 'START_REVIEW',
        toState: 'UNDER_REVIEW',
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'REVIEW_STARTED');
        },
      },
      // Request additional documents
      {
        fromState: 'UNDER_REVIEW',
        action: 'REQUEST_DOCUMENTS',
        toState: 'PENDING_DOCUMENTS',
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'DOCUMENTS_REQUESTED');
        },
      },
      // Documents provided
      {
        fromState: 'PENDING_DOCUMENTS',
        action: 'PROVIDE_DOCUMENTS',
        toState: 'UNDER_REVIEW',
        conditions: async (claim) => {
          // Check if new documents were actually uploaded
          const { count } = await this.supabase
            .from('documents')
            .select('*', { count: 'exact' })
            .eq('claim_id', claim.id)
            .gt('uploaded_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes
          return count ? count > 0 : false;
        },
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'DOCUMENTS_PROVIDED');
        },
      },
      // Start validation
      {
        fromState: 'UNDER_REVIEW',
        action: 'VALIDATE',
        toState: 'VALIDATING',
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'VALIDATION_STARTED');
        },
      },
      // Approve claim
      {
        fromState: 'VALIDATING',
        action: 'APPROVE',
        toState: 'APPROVED',
        conditions: async (claim) => {
          // Check if validation passed
          const { data } = await this.supabase
            .from('validation_history')
            .select('is_valid')
            .eq('claim_id', claim.id)
            .order('validated_at', { ascending: false })
            .limit(1)
            .single();
          return data?.is_valid ?? false;
        },
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'CLAIM_APPROVED');
        },
      },
      // Reject claim
      {
        fromState: 'VALIDATING',
        action: 'REJECT',
        toState: 'REJECTED',
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'CLAIM_REJECTED');
        },
      },
      // Cancel claim (can be done from most states)
      {
        fromState: 'DRAFT',
        action: 'CANCEL',
        toState: 'CANCELLED',
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'CLAIM_CANCELLED');
        },
      },
      {
        fromState: 'SUBMITTED',
        action: 'CANCEL',
        toState: 'CANCELLED',
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'CLAIM_CANCELLED');
        },
      },
      {
        fromState: 'UNDER_REVIEW',
        action: 'CANCEL',
        toState: 'CANCELLED',
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'CLAIM_CANCELLED');
        },
      },
      {
        fromState: 'PENDING_DOCUMENTS',
        action: 'CANCEL',
        toState: 'CANCELLED',
        sideEffects: async (claim) => {
          await this.createAuditEntry(claim, 'CLAIM_CANCELLED');
        },
      },
    ];
  }

  private async createAuditEntry(
    claim: Claim,
    action: string,
    context?: WorkflowContext,
  ): Promise<void> {
    await this.supabase.from('audit_trail').insert({
      claim_id: claim.id,
      action,
      actor_id: context?.userId || 'system',
      changes: { new_status: claim.status },
    });
  }

  async executeAction(
    claim: Claim,
    action: ClaimAction,
    context: WorkflowContext,
  ): Promise<WorkflowResult> {
    try {
      // Convert ClaimStatus to ClaimState
      const currentState = this.mapStatusToState(claim.status);

      // Find valid transition
      const transition = this.transitions.find(
        (t) => t.fromState === currentState && t.action === action,
      );

      if (!transition) {
        return {
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot perform action ${action} from state ${currentState}`,
          },
        };
      }

      // Check conditions if any
      if (transition.conditions) {
        const conditionsMet = await transition.conditions(claim);
        if (!conditionsMet) {
          return {
            success: false,
            error: {
              code: 'CONDITIONS_NOT_MET',
              message: `Conditions not met for action ${action}`,
            },
          };
        }
      }

      // Update claim status
      const { error: updateError } = await this.supabase
        .from('claims')
        .update({
          status: transition.toState,
          updated_at: new Date().toISOString(),
          processed_by: context.userId,
          processed_at: context.timestamp.toISOString(),
        })
        .eq('id', claim.id);

      if (updateError) {
        throw updateError;
      }

      // Execute side effects
      if (transition.sideEffects) {
        await transition.sideEffects(claim);
      }

      return {
        success: true,
        newState: transition.toState,
        metadata: {
          timestamp: context.timestamp,
          actor: context.userId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WORKFLOW_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private mapStatusToState(status: ClaimStatus): ClaimState {
    switch (status) {
      case 'pending':
        return 'SUBMITTED';
      case 'approved':
        return 'APPROVED';
      case 'rejected':
        return 'REJECTED';
      default:
        throw new Error(`Invalid claim status: ${status}`);
    }
  }
}
