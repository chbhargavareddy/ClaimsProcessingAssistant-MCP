export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      claims: {
        Row: {
          id: string;
          policy_id: string;
          claimant_id: string;
          status: 'pending' | 'processing' | 'approved' | 'rejected';
          type: string;
          amount: number;
          description: string;
          submitted_at: string;
          updated_at: string;
          metadata: Json;
        };
        Insert: Omit<
          Database['public']['Tables']['claims']['Row'],
          'id' | 'submitted_at' | 'updated_at'
        >;
        Update: Partial<Omit<Database['public']['Tables']['claims']['Row'], 'id'>>;
      };
      policies: {
        Row: {
          id: string;
          policy_number: string;
          holder_id: string;
          type: string;
          status: 'active' | 'inactive' | 'expired';
          start_date: string;
          end_date: string;
          coverage_amount: number;
          metadata: Json;
        };
        Insert: Omit<Database['public']['Tables']['policies']['Row'], 'id'>;
        Update: Partial<Omit<Database['public']['Tables']['policies']['Row'], 'id'>>;
      };
      documents: {
        Row: {
          id: string;
          claim_id: string;
          type: string;
          file_path: string;
          uploaded_at: string;
          metadata: Json;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'uploaded_at'>;
        Update: Partial<Omit<Database['public']['Tables']['documents']['Row'], 'id'>>;
      };
      audit_trail: {
        Row: {
          id: string;
          claim_id: string;
          action: string;
          actor_id: string;
          changes: Json;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_trail']['Row'], 'id' | 'timestamp'>;
        Update: Partial<Omit<Database['public']['Tables']['audit_trail']['Row'], 'id'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
