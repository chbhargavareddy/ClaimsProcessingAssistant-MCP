import { createClient } from '@supabase/supabase-js';
import { Claim, SubmitClaimDto } from '../../types/claim';
import { ClaimValidator } from '../validation/claim-validator';
import { ClaimWorkflowEngine } from '../workflow/engine';
import { WorkflowContext, WorkflowResult } from '../workflow/types';

export class ClaimProcessor {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  private validator = new ClaimValidator();
  private workflowEngine = new ClaimWorkflowEngine();

  async submitClaim(
    dto: SubmitClaimDto,
    userId: string,
  ): Promise<{ claim: Claim; workflowResult: WorkflowResult }> {
    // Create new claim
    const { data: claim, error } = await this.supabase
      .from('claims')
      .insert({
        ...dto,
        status: 'DRAFT',
        claimant_id: userId,
      })
      .select()
      .single();

    if (error || !claim) {
      throw new Error('Failed to create claim');
    }

    // Submit the claim through workflow
    const context: WorkflowContext = {
      userId,
      timestamp: new Date(),
    };

    const workflowResult = await this.workflowEngine.executeAction(claim, 'SUBMIT', context);

    return { claim, workflowResult };
  }

  async validateClaim(
    claimId: string,
    userId: string,
  ): Promise<{ validationResult: any; workflowResult: WorkflowResult }> {
    // Get claim
    const { data: claim, error } = await this.supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !claim) {
      throw new Error('Claim not found');
    }

    // Start validation workflow
    const context: WorkflowContext = {
      userId,
      timestamp: new Date(),
    };

    await this.workflowEngine.executeAction(claim, 'VALIDATE', context);

    // Perform validation
    const validationResult = await this.validator.validateAndSaveResult(claim, {
      userId,
      timestamp: new Date(),
    });

    // Based on validation result, approve or reject
    const action = validationResult.isValid ? 'APPROVE' : 'REJECT';
    const workflowResult = await this.workflowEngine.executeAction(claim, action, context);

    return { validationResult, workflowResult };
  }

  async requestDocuments(
    claimId: string,
    userId: string,
    requiredDocuments: string[],
  ): Promise<WorkflowResult> {
    // Get claim
    const { data: claim, error } = await this.supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !claim) {
      throw new Error('Claim not found');
    }

    // Update metadata with required documents
    await this.supabase
      .from('claims')
      .update({
        metadata: {
          ...claim.metadata,
          required_documents: requiredDocuments,
        },
      })
      .eq('id', claimId);

    // Execute workflow action
    const context: WorkflowContext = {
      userId,
      timestamp: new Date(),
      metadata: { required_documents: requiredDocuments },
    };

    return this.workflowEngine.executeAction(claim, 'REQUEST_DOCUMENTS', context);
  }

  async providedDocuments(claimId: string, userId: string): Promise<WorkflowResult> {
    // Get claim
    const { data: claim, error } = await this.supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !claim) {
      throw new Error('Claim not found');
    }

    // Execute workflow action
    const context: WorkflowContext = {
      userId,
      timestamp: new Date(),
    };

    return this.workflowEngine.executeAction(claim, 'PROVIDE_DOCUMENTS', context);
  }

  async cancelClaim(claimId: string, userId: string, reason: string): Promise<WorkflowResult> {
    // Get claim
    const { data: claim, error } = await this.supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !claim) {
      throw new Error('Claim not found');
    }

    // Execute workflow action
    const context: WorkflowContext = {
      userId,
      timestamp: new Date(),
      metadata: { cancellation_reason: reason },
    };

    return this.workflowEngine.executeAction(claim, 'CANCEL', context);
  }
}
