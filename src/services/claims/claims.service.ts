import { SupabaseClient } from '@supabase/supabase-js';
import { RedisService } from '../cache/redis.service';
import { Claim, ListClaimsFilterDto } from '../../types/claim';
import { ValidationResult } from '../../types/validation';

export class ClaimsService {
  private redis: RedisService;

  constructor(private supabase: SupabaseClient) {
    this.redis = new RedisService();
  }

  async getClaimStatus(claimId: string): Promise<{
    claim: Claim;
    validationHistory?: ValidationResult[];
    documents?: any[];
  }> {
    const cacheKey = this.redis.generateKey('claim:status', { claimId });

    return this.redis.withCache(
      cacheKey,
      300, // 5 minutes TTL
      async () => {
        const { data: claim, error } = await this.supabase
          .from('claims')
          .select(
            `
            *,
            validation_history (
              id,
              is_valid,
              errors,
              warnings,
              validated_at
            ),
            documents (
              id,
              type,
              status,
              uploaded_at
            )
          `,
          )
          .eq('id', claimId)
          .single();

        if (error || !claim) {
          throw new Error('Claim not found');
        }

        return {
          claim,
          validationHistory: claim.validation_history,
          documents: claim.documents,
        };
      },
      [`claim:${claimId}:*`], // Invalidate all cache entries for this claim
    );
  }

  async listClaims(filters: ListClaimsFilterDto = {}) {
    const cacheKey = this.redis.generateKey('claims:list', filters);

    return this.redis.withCache(
      cacheKey,
      60, // 1 minute TTL
      async () => {
        let query = this.supabase.from('claims').select('*', { count: 'exact' });

        // Apply filters
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.claim_type) {
          query = query.eq('claim_type', filters.claim_type);
        }
        if (filters.from_date) {
          query = query.gte('created_at', filters.from_date);
        }
        if (filters.to_date) {
          query = query.lte('created_at', filters.to_date);
        }
        if (filters.min_amount) {
          query = query.gte('claim_amount', filters.min_amount);
        }
        if (filters.max_amount) {
          query = query.lte('claim_amount', filters.max_amount);
        }
        if (filters.policy_number) {
          query = query.eq('policy_number', filters.policy_number);
        }
        if (filters.claimant_name) {
          query = query.ilike('claimant_name', `%${filters.claimant_name}%`);
        }

        // Add pagination
        const page = filters.page || 1;
        const pageSize = filters.limit || 10;
        const offset = (page - 1) * pageSize;

        query = query
          .range(offset, offset + pageSize - 1)
          .order('created_at', { ascending: false });

        const { data: claims, count, error } = await query;

        if (error) {
          throw error;
        }

        return {
          claims: claims || [],
          total: count || 0,
          page,
          pageSize,
        };
      },
      ['claims:list:*'], // Invalidate all list caches when data changes
    );
  }

  async validateClaim(claimId: string, userId: string): Promise<ValidationResult> {
    const cacheKey = this.redis.generateKey('claim:validation', { claimId });

    return this.redis.withCache(
      cacheKey,
      300, // 5 minutes TTL
      async () => {
        // Get claim data
        const { data: claim, error } = await this.supabase
          .from('claims')
          .select('*')
          .eq('id', claimId)
          .single();

        if (error || !claim) {
          throw new Error('Claim not found');
        }

        // Validate claim rules
        const validationResult = await this.validateClaimRules();

        // Store validation history
        if (
          (validationResult.errors && validationResult.errors.length > 0) ||
          (validationResult.warnings && validationResult.warnings.length > 0)
        ) {
          await this.supabase.from('validation_history').insert({
            claim_id: claimId,
            validated_by: userId,
            validation_date: new Date().toISOString(),
            is_valid: validationResult.isValid,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            status: validationResult.status,
          });
        }

        return validationResult;
      },
      [
        `claim:${claimId}:*`, // Invalidate all cache entries for this claim
        'claims:list:*', // Invalidate list caches as validation may change claim status
      ],
    );
  }

  private async validateClaimRules(): Promise<ValidationResult> {
    // Implementation of claim validation rules
    // This would typically check things like:
    // - Policy validity
    // - Coverage limits
    // - Document requirements
    // - Duplicate claims
    // For now, return a simple validation
    return {
      isValid: true,
      errors: [],
      status: 'VALIDATED' as const,
      warnings: [],
    };
  }
} 