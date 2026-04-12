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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string
          id: string
          session_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          client_id: string
          coach_client_id: string
          energy_level: number | null
          id: string
          other_note: string | null
          sleep_quality: number | null
          soreness_note: string | null
          submitted_at: string | null
          training_feel: number | null
          week_start_date: string
        }
        Insert: {
          client_id: string
          coach_client_id: string
          energy_level?: number | null
          id?: string
          other_note?: string | null
          sleep_quality?: number | null
          soreness_note?: string | null
          submitted_at?: string | null
          training_feel?: number | null
          week_start_date: string
        }
        Update: {
          client_id?: string
          coach_client_id?: string
          energy_level?: number | null
          id?: string
          other_note?: string | null
          sleep_quality?: number | null
          soreness_note?: string | null
          submitted_at?: string | null
          training_feel?: number | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_coach_client_id_fkey"
            columns: ["coach_client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_clients: {
        Row: {
          accepted_at: string | null
          applied_at: string | null
          assigned_program_id: string | null
          assigned_program_week: number | null
          check_in_day: number | null
          client_id: string
          client_note: string | null
          coach_id: string
          created_at: string | null
          equipment_access: string | null
          experience_level: string | null
          id: string
          status: string
          training_days_per_week: number | null
          training_goal: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          applied_at?: string | null
          assigned_program_id?: string | null
          assigned_program_week?: number | null
          check_in_day?: number | null
          client_id: string
          client_note?: string | null
          coach_id: string
          created_at?: string | null
          equipment_access?: string | null
          experience_level?: string | null
          id?: string
          status?: string
          training_days_per_week?: number | null
          training_goal?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          applied_at?: string | null
          assigned_program_id?: string | null
          assigned_program_week?: number | null
          check_in_day?: number | null
          client_id?: string
          client_note?: string | null
          coach_id?: string
          created_at?: string | null
          equipment_access?: string | null
          experience_level?: string | null
          id?: string
          status?: string
          training_days_per_week?: number | null
          training_goal?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coach_profiles: {
        Row: {
          accepts_clients: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          external_link: string | null
          id: string
          is_verified: boolean
          pinned_program_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepts_clients?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          external_link?: string | null
          id?: string
          is_verified?: boolean
          pinned_program_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepts_clients?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          external_link?: string | null
          id?: string
          is_verified?: boolean
          pinned_program_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category: string
          created_at: string
          description: string | null
          exercise_id: string
          id: string
          is_custom: boolean
          is_override: boolean
          muscle_group: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          exercise_id: string
          id?: string
          is_custom?: boolean
          is_override?: boolean
          muscle_group: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          exercise_id?: string
          id?: string
          is_custom?: boolean
          is_override?: boolean
          muscle_group?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      measurement_logs: {
        Row: {
          created_at: string | null
          id: string
          logged_at: string | null
          measurement_type_id: string
          notes: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          logged_at?: string | null
          measurement_type_id: string
          notes?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          logged_at?: string | null
          measurement_type_id?: string
          notes?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurement_logs_measurement_type_id_fkey"
            columns: ["measurement_type_id"]
            isOneToOne: false
            referencedRelation: "measurement_types"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_types: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          unit?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          tier: Database["public"]["Enums"]["membership_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          tier?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          tier?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          coach_client_id: string
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          coach_client_id: string
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          coach_client_id?: string
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_coach_client_id_fkey"
            columns: ["coach_client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          google_user_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          google_user_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          google_user_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          program_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          program_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          program_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      program_follows: {
        Row: {
          created_at: string
          id: string
          imported_manifest: Json
          is_scheduled: boolean
          program_id: string
          program_version: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_manifest?: Json
          is_scheduled?: boolean
          program_id: string
          program_version?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_manifest?: Json
          is_scheduled?: boolean
          program_id?: string
          program_version?: number
          user_id?: string
        }
        Relationships: []
      }
      program_purchases: {
        Row: {
          amount: number
          checkout_token: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          program_id: string
          program_version: number
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          checkout_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          program_id: string
          program_version?: number
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          program_id?: string
          program_version?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      program_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          program_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          program_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          program_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      program_reviews: {
        Row: {
          created_at: string
          id: string
          is_flagged: boolean
          program_id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_flagged?: boolean
          program_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_flagged?: boolean
          program_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          banner_image_url: string | null
          category_tags: string[]
          coach_id: string
          created_at: string
          currency: string | null
          days_per_week: number | null
          difficulty: string
          equipment_tags: string[]
          id: string
          long_description: string | null
          manifest: Json
          preview_weeks: number
          price_amount: number | null
          program_id: string
          promo_video_url: string | null
          published_at: string | null
          short_description: string | null
          status: string
          title: string
          total_weeks: number | null
          updated_at: string
          version_number: number
          visibility: string
        }
        Insert: {
          banner_image_url?: string | null
          category_tags?: string[]
          coach_id: string
          created_at?: string
          currency?: string | null
          days_per_week?: number | null
          difficulty?: string
          equipment_tags?: string[]
          id?: string
          long_description?: string | null
          manifest?: Json
          preview_weeks?: number
          price_amount?: number | null
          program_id: string
          promo_video_url?: string | null
          published_at?: string | null
          short_description?: string | null
          status?: string
          title: string
          total_weeks?: number | null
          updated_at?: string
          version_number?: number
          visibility?: string
        }
        Update: {
          banner_image_url?: string | null
          category_tags?: string[]
          coach_id?: string
          created_at?: string
          currency?: string | null
          days_per_week?: number | null
          difficulty?: string
          equipment_tags?: string[]
          id?: string
          long_description?: string | null
          manifest?: Json
          preview_weeks?: number
          price_amount?: number | null
          program_id?: string
          promo_video_url?: string | null
          published_at?: string | null
          short_description?: string | null
          status?: string
          title?: string
          total_weeks?: number | null
          updated_at?: string
          version_number?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          created_at: string | null
          id: string
          is_visible_to_coach: boolean | null
          notes: string | null
          storage_path: string
          taken_at: string | null
          thumbnail_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible_to_coach?: boolean | null
          notes?: string | null
          storage_path: string
          taken_at?: string | null
          thumbnail_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible_to_coach?: boolean | null
          notes?: string | null
          storage_path?: string
          taken_at?: string | null
          thumbnail_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_history: {
        Row: {
          completed_at: string
          created_at: string
          duration: number
          exercises: Json
          history_id: string
          id: string
          user_id: string
          workout_name: string
          workout_template_id: string | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          duration?: number
          exercises?: Json
          history_id: string
          id?: string
          user_id: string
          workout_name: string
          workout_template_id?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          duration?: number
          exercises?: Json
          history_id?: string
          id?: string
          user_id?: string
          workout_name?: string
          workout_template_id?: string | null
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          created_at: string
          end_date: string | null
          exceptions: Json
          id: string
          is_active: boolean
          name: string
          plan_id: string
          start_date: string
          updated_at: string
          user_id: string
          weekly_assignments: Json
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          exceptions?: Json
          id?: string
          is_active?: boolean
          name?: string
          plan_id: string
          start_date?: string
          updated_at?: string
          user_id: string
          weekly_assignments?: Json
        }
        Update: {
          created_at?: string
          end_date?: string | null
          exceptions?: Json
          id?: string
          is_active?: boolean
          name?: string
          plan_id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
          weekly_assignments?: Json
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          exercises: Json
          id: string
          name: string
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercises?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          exercises?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_membership: {
        Args: {
          _tier: Database["public"]["Enums"]["membership_tier"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      membership_tier: "free" | "premium"
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
      membership_tier: ["free", "premium"],
    },
  },
} as const
