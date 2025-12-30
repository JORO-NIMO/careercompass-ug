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
  public: {
    Tables: {
      ads: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string
          link: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url: string
          link?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string
          link?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      placements: {
        Row: {
          approved: boolean
          available_slots: number
          company_name: string
          contact_info: string | null
          created_at: string | null
          created_by: string | null
          description: string
          flag_reason: string | null
          flagged: boolean
          flagged_at: string | null
          flagged_by: string | null
          id: string
          industry: string
          position_title: string
          region: string
          stipend: string
          updated_at: string | null
        }
        Insert: {
          approved?: boolean
          available_slots: number
          company_name: string
          contact_info?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          industry: string
          position_title: string
          region: string
          stipend: string
          updated_at?: string | null
        }
        Update: {
          approved?: boolean
          available_slots?: number
          company_name?: string
          contact_info?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          industry?: string
          position_title?: string
          region?: string
          stipend?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placements_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      bullets: {
        Row: {
          id: string
          owner_id: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bullet_transactions: {
        Row: {
          id: string
          owner_id: string
          delta: number
          reason: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          owner_id: string
          delta: number
          reason: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          owner_id?: string
          delta?: number
          reason?: string
          created_at?: string
          created_by?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          id: string
          entity_id: string
          entity_type: string
          starts_at: string
          ends_at: string
          is_active: boolean
          payment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_id: string
          entity_type?: string
          starts_at?: string
          ends_at: string
          is_active?: boolean
          payment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_id?: string
          entity_type?: string
          starts_at?: string
          ends_at?: string
          is_active?: boolean
          payment_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          created_by: string | null
          owner_id: string
          name: string
          location_raw: string | null
          maps_place_id: string | null
          formatted_address: string | null
          website_url: string | null
          contact_email: string | null
          approved: boolean
          maps_verified: boolean
          web_verified: boolean
          verification_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by?: string | null
          owner_id: string
          name: string
          location_raw?: string | null
          maps_place_id?: string | null
          formatted_address?: string | null
          website_url?: string | null
          contact_email?: string | null
          approved?: boolean
          maps_verified?: boolean
          web_verified?: boolean
          verification_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string | null
          owner_id?: string
          name?: string
          location_raw?: string | null
          maps_place_id?: string | null
          formatted_address?: string | null
          website_url?: string | null
          contact_email?: string | null
          approved?: boolean
          maps_verified?: boolean
          web_verified?: boolean
          verification_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      listings: {
        Row: {
          id: string
          company_id: string | null
          title: string
          description: string
          is_featured: boolean
          display_order: number
          opportunity_type: string | null
          application_deadline: string | null
          application_method: string | null
          whatsapp_number: string | null
          application_email: string | null
          application_url: string | null
          region: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          title: string
          description: string
          is_featured?: boolean
          display_order?: number
          opportunity_type?: string | null
          application_deadline?: string | null
          application_method?: string | null
          whatsapp_number?: string | null
          application_email?: string | null
          application_url?: string | null
          region?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          title?: string
          description?: string
          is_featured?: boolean
          display_order?: number
          opportunity_type?: string | null
          application_deadline?: string | null
          application_method?: string | null
          whatsapp_number?: string | null
          application_email?: string | null
          application_url?: string | null
          region?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      company_media: {
        Row: {
          id: string
          company_id: string
          placement_id: string | null
          url: string
          path: string
          type: string
          size: number
          uploaded_at: string
        }
        Insert: {
          id?: string
          company_id: string
          placement_id?: string | null
          url: string
          path: string
          type: string
          size: number
          uploaded_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          placement_id?: string | null
          url?: string
          path?: string
          type?: string
          size?: number
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_media_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_media_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          areas_of_interest: string[] | null
          availability_status: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          location: string | null
          experience_level: string | null
          cv_url: string | null
          school_name: string | null
          course_of_study: string | null
          year_of_study: string | null
          portfolio_url: string | null
          updated_at: string | null
        }
        Insert: {
          areas_of_interest?: string[] | null
          availability_status?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          location?: string | null
          experience_level?: string | null
          cv_url?: string | null
          school_name?: string | null
          course_of_study?: string | null
          year_of_study?: string | null
          portfolio_url?: string | null
          updated_at?: string | null
        }
        Update: {
          areas_of_interest?: string[] | null
          availability_status?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          location?: string | null
          experience_level?: string | null
          cv_url?: string | null
          school_name?: string | null
          course_of_study?: string | null
          year_of_study?: string | null
          portfolio_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: string
          title: string
          body: string | null
          message: string | null
          metadata: Json | null
          channel: string[] | null
          scheduled_at: string | null
          sent_at: string | null
          read: boolean | null
          created_at: string | null
          target_role: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          title: string
          body?: string | null
          message?: string | null
          metadata?: Json | null
          channel?: string[] | null
          scheduled_at?: string | null
          sent_at?: string | null
          read?: boolean | null
          created_at?: string | null
          target_role?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          title?: string
          body?: string | null
          message?: string | null
          metadata?: Json | null
          channel?: string[] | null
          scheduled_at?: string | null
          sent_at?: string | null
          read?: boolean | null
          created_at?: string | null
          target_role?: string | null
          created_by?: string | null
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          user_id: string
          read_at: string | null
        }
        Insert: {
          id?: string
          notification_id: string
          user_id: string
          read_at?: string | null
        }
        Update: {
          id?: string
          notification_id?: string
          user_id?: string
          read_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      | "employer"
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
  public: {
    Enums: {
      app_role: ["admin", "user", "employer"],
    },
  },
} as const
