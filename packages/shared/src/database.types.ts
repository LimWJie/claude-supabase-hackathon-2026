// Hand-written placeholder until local Supabase runs.
// Regenerate with `pnpm db:types` (this file will be overwritten).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type MatchesRow = {
  code: string
  created_at: string
  finished_at: string | null
  guest_id: string | null
  host_id: string
  id: string
  state: Json
  status: Database['public']['Enums']['match_status']
  updated_at: string
  winner_id: string | null
}

export type Database = {
  public: {
    Tables: {
      matches: {
        Row: MatchesRow
        Insert: {
          code: string
          created_at?: string
          finished_at?: string | null
          guest_id?: string | null
          host_id: string
          id?: string
          state?: Json
          status?: Database['public']['Enums']['match_status']
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          finished_at?: string | null
          guest_id?: string | null
          host_id?: string
          id?: string
          state?: Json
          status?: Database['public']['Enums']['match_status']
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_match: {
        Args: Record<PropertyKey, never>
        Returns: MatchesRow
      }
      is_match_player: {
        Args: { topic: string }
        Returns: boolean
      }
      join_match: {
        Args: { match_code: string }
        Returns: MatchesRow
      }
      make_guess: {
        Args: { guess: number; match_id: string }
        Returns: MatchesRow
      }
    }
    Enums: {
      match_status: 'waiting' | 'active' | 'finished' | 'abandoned'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
