export type Json = any

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_state_snapshots: {
        Row: {
          created_at: string
          id: string
          payload: Json
          profile_id: string
          scope_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          profile_id: string
          scope_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          profile_id?: string
          scope_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_state_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_data: {
        Row: {
          body_composition_data: Json | null
          created_at: string
          exercise_data: Json | null
          id: string
          nutrition_data: Json | null
          running_data: Json | null
          sleep_data: Json | null
          steps_data: Json | null
          synced_at: string
          user_id: string | null
        }
        Insert: {
          body_composition_data?: Json | null
          created_at?: string
          exercise_data?: Json | null
          id?: string
          nutrition_data?: Json | null
          running_data?: Json | null
          sleep_data?: Json | null
          steps_data?: Json | null
          synced_at?: string
          user_id?: string | null
        }
        Update: {
          body_composition_data?: Json | null
          created_at?: string
          exercise_data?: Json | null
          id?: string
          nutrition_data?: Json | null
          running_data?: Json | null
          sleep_data?: Json | null
          steps_data?: Json | null
          synced_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      openai_credentials: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          profile_id: string
          project_id: string
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          profile_id: string
          project_id: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          profile_id?: string
          project_id?: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "openai_credentials_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          nickname: string
          samsung_health_connected_at: string | null
          samsung_health_device_id: string | null
          samsung_health_last_sync_at: string | null
          updated_at: string | null
          user_id: string
          user_id_changed: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nickname: string
          samsung_health_connected_at?: string | null
          samsung_health_device_id?: string | null
          samsung_health_last_sync_at?: string | null
          updated_at?: string | null
          user_id: string
          user_id_changed?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nickname?: string
          samsung_health_connected_at?: string | null
          samsung_health_device_id?: string | null
          samsung_health_last_sync_at?: string | null
          updated_at?: string | null
          user_id?: string
          user_id_changed?: boolean | null
        }
        Relationships: []
      }
      user_earned_badges: {
        Row: {
          badge_id: string
          description: string
          earned_at: string
          icon: string
          id: string
          name: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          badge_id: string
          description: string
          earned_at?: string
          icon: string
          id: string
          name: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          badge_id?: string
          description?: string
          earned_at?: string
          icon?: string
          id?: string
          name?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_earned_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile_preferences: {
        Row: {
          display_record_type: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          display_record_type?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          display_record_type?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile_settings: {
        Row: {
          avatar_url: string
          bio: string
          created_at: string
          id: string
          nickname: string
          profile_id: string
          show_badges: boolean
          show_personal_feed: boolean
          show_summary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string
          bio?: string
          created_at?: string
          id: string
          nickname: string
          profile_id: string
          show_badges?: boolean
          show_personal_feed?: boolean
          show_summary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string
          bio?: string
          created_at?: string
          id?: string
          nickname?: string
          profile_id?: string
          show_badges?: boolean
          show_personal_feed?: boolean
          show_summary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_verified_records: {
        Row: {
          certified: boolean
          id: string
          label: string
          official_time: string
          profile_id: string
          record_type: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          certified?: boolean
          id: string
          label: string
          official_time: string
          profile_id: string
          record_type: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          certified?: boolean
          id?: string
          label?: string
          official_time?: string
          profile_id?: string
          record_type?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_verified_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          profile_id: string
          room_id: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id: string
          profile_id: string
          room_id: string
          sender_id: string
          sender_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          profile_id?: string
          room_id?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_chat_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_chat_rooms: {
        Row: {
          created_at: string
          id: string
          member_ids: Json
          name: string
          profile_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          member_ids?: Json
          name: string
          profile_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_ids?: Json
          name?: string
          profile_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_chat_rooms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_feed_comments: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          liked_user_ids: Json
          parent_id: string | null
          post_id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string
          id: string
          liked_user_ids?: Json
          parent_id?: string | null
          post_id: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          liked_user_ids?: Json
          parent_id?: string | null
          post_id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_feed_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_feed_posts: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          media: Json
          profile_id: string
          tags: Json
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          author_name: string
          content?: string
          created_at?: string
          id: string
          media?: Json
          profile_id: string
          tags?: Json
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          media?: Json
          profile_id?: string
          tags?: Json
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_feed_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_friends: {
        Row: {
          added_at: string
          id: string
          name: string
          phone: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          id: string
          name: string
          phone?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          id?: string
          name?: string
          phone?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_friends_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entertainment_challenges: {
        Row: {
          id: string
          profile_id: string
          title: string
          description: string
          details: string
          reward: string
          icon: string
          progress: number
          joined_user_ids: Json
          completed_user_ids: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          profile_id: string
          title: string
          description?: string
          details?: string
          reward?: string
          icon?: string
          progress?: number
          joined_user_ids?: Json
          completed_user_ids?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          description?: string
          details?: string
          reward?: string
          icon?: string
          progress?: number
          joined_user_ids?: Json
          completed_user_ids?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      entertainment_scores: {
        Row: {
          id: string
          profile_id: string
          game_id: string
          best_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          profile_id: string
          game_id: string
          best_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          game_id?: string
          best_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      entertainment_score_events: {
        Row: {
          id: string
          profile_id: string
          user_id: string
          player_name: string
          game_id: string
          score: number
          played_at: string
        }
        Insert: {
          id: string
          profile_id: string
          user_id: string
          player_name: string
          game_id: string
          score?: number
          played_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          user_id?: string
          player_name?: string
          game_id?: string
          score?: number
          played_at?: string
        }
        Relationships: []
      }
      entertainment_rooms: {
        Row: {
          id: string
          profile_id: string
          title: string
          host_id: string
          host_name: string
          game_id: string
          room_mode: string
          room_status: string
          visibility: string
          editable_by: string
          duration_seconds: number | null
          team_mode: boolean
          participants: Json
          chat: Json
          system_events: Json
          max_players: number
          room_rules: Json | null
          game_state: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          profile_id: string
          title: string
          host_id: string
          host_name: string
          game_id: string
          room_mode: string
          room_status?: string
          visibility?: string
          editable_by?: string
          duration_seconds?: number | null
          team_mode?: boolean
          participants?: Json
          chat?: Json
          system_events?: Json
          max_players?: number
          room_rules?: Json | null
          game_state?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          host_id?: string
          host_name?: string
          game_id?: string
          room_mode?: string
          room_status?: string
          visibility?: string
          editable_by?: string
          duration_seconds?: number | null
          team_mode?: boolean
          participants?: Json
          chat?: Json
          system_events?: Json
          max_players?: number
          room_rules?: Json | null
          game_state?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      entertainment_strategy_matches: {
        Row: {
          id: string
          room_id: string
          profile_id: string | null
          game_id: string
          mode: string
          status: string
          current_turn: number
          current_user_turn: string
          winner_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          room_id: string
          profile_id?: string | null
          game_id: string
          mode: string
          status: string
          current_turn?: number
          current_user_turn?: string
          winner_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          profile_id?: string | null
          game_id?: string
          mode?: string
          status?: string
          current_turn?: number
          current_user_turn?: string
          winner_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      entertainment_strategy_events: {
        Row: {
          id: string
          match_id: string
          room_id: string
          user_id: string
          action_type: string
          payload: Json
          created_at: string
        }
        Insert: {
          id: string
          match_id: string
          room_id: string
          user_id: string
          action_type: string
          payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          room_id?: string
          user_id?: string
          action_type?: string
          payload?: Json
          created_at?: string
        }
        Relationships: []
      }
      entertainment_strategy_snapshots: {
        Row: {
          id: string
          match_id: string
          version: number
          state: Json
          created_at: string
        }
        Insert: {
          id: string
          match_id: string
          version: number
          state?: Json
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          version?: number
          state?: Json
          created_at?: string
        }
        Relationships: []
      }
      entertainment_strategy_season_scores: {
        Row: {
          id: string
          user_id: string
          wins: number
          losses: number
          rating: number
          capture_points: number
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          wins?: number
          losses?: number
          rating?: number
          capture_points?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wins?: number
          losses?: number
          rating?: number
          capture_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      entertainment_worlds: {
        Row: {
          id: string
          owner_user_id: string
          title: string
          theme: string
          visibility: string
          public_editable: boolean
          likes_count: number
          visits_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          owner_user_id: string
          title: string
          theme?: string
          visibility?: string
          public_editable?: boolean
          likes_count?: number
          visits_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          title?: string
          theme?: string
          visibility?: string
          public_editable?: boolean
          likes_count?: number
          visits_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      entertainment_world_snapshots: {
        Row: {
          id: string
          world_id: string
          version: number
          state: Json
          created_at: string
        }
        Insert: {
          id: string
          world_id: string
          version: number
          state?: Json
          created_at?: string
        }
        Update: {
          id?: string
          world_id?: string
          version?: number
          state?: Json
          created_at?: string
        }
        Relationships: []
      }
      entertainment_world_events: {
        Row: {
          id: string
          world_id: string
          user_id: string
          action_type: string
          payload: Json
          created_at: string
        }
        Insert: {
          id: string
          world_id: string
          user_id: string
          action_type: string
          payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          world_id?: string
          user_id?: string
          action_type?: string
          payload?: Json
          created_at?: string
        }
        Relationships: []
      }
      entertainment_world_reactions: {
        Row: {
          id: string
          world_id: string
          user_id: string
          reaction_type: string
          created_at: string
        }
        Insert: {
          id: string
          world_id: string
          user_id: string
          reaction_type: string
          created_at?: string
        }
        Update: {
          id?: string
          world_id?: string
          user_id?: string
          reaction_type?: string
          created_at?: string
        }
        Relationships: []
      }
      entertainment_world_permissions: {
        Row: {
          id: string
          world_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          world_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          world_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      transfer_logs: {
        Row: {
          created_at: string | null
          id: string
          log_type: string
          message: string
          profile_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_type: string
          message: string
          profile_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          log_type?: string
          message?: string
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
  public: {
    Enums: {},
  },
} as const
