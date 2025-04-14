import {
  ValidationRule,
  ValidationEngine,
  ValidationResult,
  ValidationContext,
  ValidationError,
  ValidationWarning
} from './types';

export class BaseValidationEngine<T> implements ValidationEngine<T> {
  private rules: ValidationRule<T>[] = [];

  addRule(rule: ValidationRule<T>): void {
    this.rules.push(rule);
  }

  async validate(data: T, context: ValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Run all validation rules
    const results = await Promise.all(
      this.rules.map(rule => rule.validate(data, context))
    );

    // Combine all results
    results.forEach(result => {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}