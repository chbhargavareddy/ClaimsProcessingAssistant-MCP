import { supabase, supabaseAdmin } from '../config/supabase.config';
import { Database } from '../types/database.types';

export class SupabaseService {
  /**
   * Create a new claim
   */
  async createClaim(data: Database['public']['Tables']['claims']['Insert']) {
    const { data: claim, error } = await supabase.from('claims').insert(data).select().single();

    if (error) throw error;
    return claim;
  }

  /**
   * Get a claim by ID
   */
  async getClaim(id: string) {
    const { data: claim, error } = await supabase
      .from('claims')
      .select(
        `
        *,
        policy:policies(*),
        documents:documents(*)
      `,
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return claim;
  }

  /**
   * Update a claim
   */
  async updateClaim(id: string, data: Database['public']['Tables']['claims']['Update']) {
    const { data: claim, error } = await supabase
      .from('claims')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return claim;
  }

  /**
   * List claims with optional filters
   */
  async listClaims(filters?: { status?: string; policy_id?: string; claimant_id?: string }) {
    let query = supabase.from('claims').select(`
        *,
        policy:policies(*),
        documents:documents(*)
      `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.policy_id) {
      query = query.eq('policy_id', filters.policy_id);
    }
    if (filters?.claimant_id) {
      query = query.eq('claimant_id', filters.claimant_id);
    }

    const { data: claims, error } = await query;

    if (error) throw error;
    return claims;
  }

  /**
   * Add a document to a claim
   */
  async addDocument(data: Database['public']['Tables']['documents']['Insert']) {
    const { data: document, error } = await supabase
      .from('documents')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return document;
  }

  /**
   * Add an audit trail entry
   */
  async addAuditTrail(data: Database['public']['Tables']['audit_trail']['Insert']) {
    const { data: audit, error } = await supabase
      .from('audit_trail')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return audit;
  }

  /**
   * Get policy by ID
   */
  async getPolicy(id: string) {
    const { data: policy, error } = await supabase
      .from('policies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return policy;
  }
}
