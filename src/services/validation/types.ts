import { Claim } from '../../types/claim';
import { Document } from '../../types/document';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationContext {
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ValidationRule<T> {
  code: string;
  validate: (data: T, context: ValidationContext) => Promise<ValidationResult>;
}

export interface ValidationEngine<T> {
  addRule: (rule: ValidationRule<T>) => void;
  validate: (data: T, context: ValidationContext) => Promise<ValidationResult>;
}