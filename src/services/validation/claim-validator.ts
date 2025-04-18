import { Claim } from '../../types/claim';
import { BaseValidationEngine } from './engine';
import { ValidationContext, ValidationResult } from './types';
import { policyValidationRule, requiredDocumentsRule, duplicateClaimRule } from './claim-rules';
import { createClient } from '@supabase/supabase-js';

export class ClaimValidator extends BaseValidationEngine<Claim> {
  constructor() {
    super();
    // Add all claim validation rules
    this.addRule(policyValidationRule);
    this.addRule(requiredDocumentsRule);
    this.addRule(duplicateClaimRule);
  }

  async validateAndSaveResult(claim: Claim, context: ValidationContext): Promise<ValidationResult> {
    const result = await this.validate(claim, context);

    // Save validation result to database
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    await supabase.from('validation_history').insert({
      claim_id: claim.id,
      is_valid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      validated_by: context.userId,
    });

    return result;
  }
}
