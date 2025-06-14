export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          organization_id: string
          email: string
          full_name: string
          role: 'admin' | 'partner' | 'analyst'
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          email: string
          full_name: string
          role?: 'admin' | 'partner' | 'analyst'
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'partner' | 'analyst'
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      sectors: {
        Row: {
          id: string
          organization_id: string
          name: string
          parent_id: string | null
          description: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          parent_id?: string | null
          description?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          parent_id?: string | null
          description?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          organization_id: string
          name: string
          website: string | null
          sector_id: string | null
          founded_date: string | null
          location: string | null
          description: string | null
          metadata: Json
          crunchbase_url: string | null
          linkedin_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          website?: string | null
          sector_id?: string | null
          founded_date?: string | null
          location?: string | null
          description?: string | null
          metadata?: Json
          crunchbase_url?: string | null
          linkedin_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          website?: string | null
          sector_id?: string | null
          founded_date?: string | null
          location?: string | null
          description?: string | null
          metadata?: Json
          crunchbase_url?: string | null
          linkedin_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          organization_id: string
          company_id: string
          title: string
          stage: 'thesis_fit' | 'signals' | 'validation' | 'conviction' | 'term_sheet' | 'due_diligence' | 'closed'
          analyst_id: string | null
          partner_id: string | null
          check_size_min: number | null
          check_size_max: number | null
          valuation: number | null
          round_size: number | null
          tags: string[]
          notes: string | null
          metadata: Json
          thesis_fit_score: number | null
          market_score: number | null
          team_score: number | null
          product_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          company_id: string
          title: string
          stage?: 'thesis_fit' | 'signals' | 'validation' | 'conviction' | 'term_sheet' | 'due_diligence' | 'closed'
          analyst_id?: string | null
          partner_id?: string | null
          check_size_min?: number | null
          check_size_max?: number | null
          valuation?: number | null
          round_size?: number | null
          tags?: string[]
          notes?: string | null
          metadata?: Json
          thesis_fit_score?: number | null
          market_score?: number | null
          team_score?: number | null
          product_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          company_id?: string
          title?: string
          stage?: 'thesis_fit' | 'signals' | 'validation' | 'conviction' | 'term_sheet' | 'due_diligence' | 'closed'
          analyst_id?: string | null
          partner_id?: string | null
          check_size_min?: number | null
          check_size_max?: number | null
          valuation?: number | null
          round_size?: number | null
          tags?: string[]
          notes?: string | null
          metadata?: Json
          thesis_fit_score?: number | null
          market_score?: number | null
          team_score?: number | null
          product_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          organization_id: string
          deal_id: string | null
          company_id: string | null
          title: string
          file_path: string
          file_size: number
          mime_type: string
          uploaded_by: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          deal_id?: string | null
          company_id?: string | null
          title: string
          file_path: string
          file_size: number
          mime_type: string
          uploaded_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          deal_id?: string | null
          company_id?: string | null
          title?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          uploaded_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      deal_analyses: {
        Row: {
          id: string
          deal_id: string
          response_id: string | null
          analysis_type: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          result: Json
          token_usage: Json
          error_message: string | null
          requested_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          response_id?: string | null
          analysis_type: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          result?: Json
          token_usage?: Json
          error_message?: string | null
          requested_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          response_id?: string | null
          analysis_type?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          result?: Json
          token_usage?: Json
          error_message?: string | null
          requested_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      investment_memos: {
        Row: {
          id: string
          deal_id: string
          response_id: string | null
          version: number
          title: string
          content: Json
          status: 'pending' | 'processing' | 'completed' | 'failed'
          token_usage: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          response_id?: string | null
          version?: number
          title: string
          content: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          token_usage?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          response_id?: string | null
          version?: number
          title?: string
          content?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          token_usage?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          entity_type: string
          entity_id: string
          action: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          entity_type: string
          entity_id: string
          action: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          entity_type?: string
          entity_id?: string
          action?: string
          details?: Json
          created_at?: string
        }
      }
      knowledge_articles: {
        Row: {
          id: string
          organization_id: string
          title: string
          source: string
          url: string | null
          content: string
          sector_ids: string[]
          tags: string[]
          published_date: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          source: string
          url?: string | null
          content: string
          sector_ids?: string[]
          tags?: string[]
          published_date?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          source?: string
          url?: string | null
          content?: string
          sector_ids?: string[]
          tags?: string[]
          published_date?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      article_chunks: {
        Row: {
          id: string
          article_id: string
          chunk_index: number
          content: string
          embedding: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          article_id: string
          chunk_index: number
          content: string
          embedding?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          chunk_index?: number
          content?: string
          embedding?: string | null
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role: 'admin' | 'partner' | 'analyst'
      deal_stage: 'thesis_fit' | 'signals' | 'validation' | 'conviction' | 'term_sheet' | 'due_diligence' | 'closed'
      document_status: 'pending' | 'processing' | 'completed' | 'failed'
      analysis_status: 'pending' | 'processing' | 'completed' | 'failed'
    }
  }
}