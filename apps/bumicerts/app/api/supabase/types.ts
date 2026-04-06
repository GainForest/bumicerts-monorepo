export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      drafts_bumicert: {
        Row: {
          created_at: string
          data: Json
          id: number
          ownerDid: string
          published_at: string | null
          published_rkey: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          data: Json
          id?: number
          ownerDid?: string
          published_at?: string | null
          published_rkey?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          ownerDid?: string
          published_at?: string | null
          published_rkey?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      form_events: {
        Row: {
          context: Json | null
          created_at: string | null
          hypercert_id: string | null
          id: string
          occurred_at: string
          session_id: string
          status: string
          step: string
          submission_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          hypercert_id?: string | null
          id?: string
          occurred_at: string
          session_id: string
          status: string
          step: string
          submission_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          hypercert_id?: string | null
          id?: string
          occurred_at?: string
          session_id?: string
          status?: string
          step?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemetry_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_enrichment: {
        Row: {
          admin1: string | null
          admin2: string | null
          centroid_lat: number
          centroid_lng: number
          confidence: number | null
          continent: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          geojson_hash: string
          hectares: number
          hypercert_id: string
          id: string
          last_refreshed: string
          locality: string | null
          provider: string | null
          raw_response: Json | null
        }
        Insert: {
          admin1?: string | null
          admin2?: string | null
          centroid_lat: number
          centroid_lng: number
          confidence?: number | null
          continent?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          geojson_hash: string
          hectares: number
          hypercert_id: string
          id?: string
          last_refreshed: string
          locality?: string | null
          provider?: string | null
          raw_response?: Json | null
        }
        Update: {
          admin1?: string | null
          admin2?: string | null
          centroid_lat?: number
          centroid_lng?: number
          confidence?: number | null
          continent?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          geojson_hash?: string
          hectares?: number
          hypercert_id?: string
          id?: string
          last_refreshed?: string
          locality?: string | null
          provider?: string | null
          raw_response?: Json | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          email: string
          otp_hash: string
          pds_domain: string
          verified_at: string | null
          expires_at: string
        }
        Insert: {
          email: string
          otp_hash: string
          pds_domain: string
          verified_at?: string | null
          expires_at: string
        }
        Update: {
          email?: string
          otp_hash?: string
          pds_domain?: string
          verified_at?: string | null
          expires_at?: string
        }
        Relationships: []
      }
      ipfs_upload_logs: {
        Row: {
          cid: string | null
          context: Json | null
          created_at: string | null
          id: string
          message: string | null
          mime_type: string | null
          occurred_at: string
          session_id: string | null
          size_bytes: number | null
          status: string
          wallet_address: string | null
        }
        Insert: {
          cid?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string | null
          mime_type?: string | null
          occurred_at: string
          session_id?: string | null
          size_bytes?: number | null
          status: string
          wallet_address?: string | null
        }
        Update: {
          cid?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string | null
          mime_type?: string | null
          occurred_at?: string
          session_id?: string | null
          size_bytes?: number | null
          status?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ipfs_upload_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemetry_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lifi_swap_events: {
        Row: {
          amount_in: number | null
          amount_out: number | null
          context: Json | null
          created_at: string | null
          duration_ms: number | null
          error_label: string | null
          event_type: string
          from_chain_id: number | null
          from_token: string | null
          hypercert_id: string
          id: string
          occurred_at: string
          route_id: string | null
          session_id: string
          to_chain_id: number | null
          to_token: string | null
        }
        Insert: {
          amount_in?: number | null
          amount_out?: number | null
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_label?: string | null
          event_type: string
          from_chain_id?: number | null
          from_token?: string | null
          hypercert_id: string
          id?: string
          occurred_at: string
          route_id?: string | null
          session_id: string
          to_chain_id?: number | null
          to_token?: string | null
        }
        Update: {
          amount_in?: number | null
          amount_out?: number | null
          context?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_label?: string | null
          event_type?: string
          from_chain_id?: number | null
          from_token?: string | null
          hypercert_id?: string
          id?: string
          occurred_at?: string
          route_id?: string | null
          session_id?: string
          to_chain_id?: number | null
          to_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lifi_swap_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemetry_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_flow_events: {
        Row: {
          context: Json | null
          created_at: string | null
          hypercert_id: string
          id: string
          occurred_at: string
          order_id: string
          session_id: string
          status: string
          step_index: number
          step_name: string
          tx_hash: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          hypercert_id: string
          id?: string
          occurred_at: string
          order_id: string
          session_id: string
          status: string
          step_index: number
          step_name: string
          tx_hash?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          hypercert_id?: string
          id?: string
          occurred_at?: string
          order_id?: string
          session_id?: string
          status?: string
          step_index?: number
          step_name?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_flow_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemetry_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_feedback: {
        Row: {
          created_at: string
          feedback: string | null
          id: number
          rating: number
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: number
          rating: number
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: number
          rating?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          id: string
          identifier: string
          endpoint: string
          created_at: string
        }
        Insert: {
          id?: string
          identifier: string
          endpoint: string
          created_at?: string
        }
        Update: {
          id?: string
          identifier?: string
          endpoint?: string
          created_at?: string
        }
        Relationships: []
      }
      telemetry_sessions: {
        Row: {
          created_at: string
          id: string
          last_seen: string
          referrer: string | null
          user_agent: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen: string
          referrer?: string | null
          user_agent?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string
          referrer?: string | null
          user_agent?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      wallet_events: {
        Row: {
          chain_id: number | null
          connector: string | null
          context: Json | null
          created_at: string | null
          event_type: string
          id: string
          message: string | null
          occurred_at: string
          session_id: string
          wallet_address: string | null
        }
        Insert: {
          chain_id?: number | null
          connector?: string | null
          context?: Json | null
          created_at?: string | null
          event_type: string
          id?: string
          message?: string | null
          occurred_at: string
          session_id: string
          wallet_address?: string | null
        }
        Update: {
          chain_id?: number | null
          connector?: string | null
          context?: Json | null
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string | null
          occurred_at?: string
          session_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telemetry_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
