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
      behavior_logs: {
        Row: {
          barking: boolean | null
          comfort_distance_meters: number | null
          comments: string | null
          created_at: string
          day_id: number
          dog_id: string
          dog_reaction_level: number | null
          focus_quality: string | null
          id: string
          jump_on_human: boolean | null
          leash_walk_quality: string | null
          no_response: string | null
          recovery_after_trigger: string | null
          stop_response: string | null
          tension_level: number | null
          user_id: string
        }
        Insert: {
          barking?: boolean | null
          comfort_distance_meters?: number | null
          comments?: string | null
          created_at?: string
          day_id: number
          dog_id: string
          dog_reaction_level?: number | null
          focus_quality?: string | null
          id?: string
          jump_on_human?: boolean | null
          leash_walk_quality?: string | null
          no_response?: string | null
          recovery_after_trigger?: string | null
          stop_response?: string | null
          tension_level?: number | null
          user_id: string
        }
        Update: {
          barking?: boolean | null
          comfort_distance_meters?: number | null
          comments?: string | null
          created_at?: string
          day_id?: number
          dog_id?: string
          dog_reaction_level?: number | null
          focus_quality?: string | null
          id?: string
          jump_on_human?: boolean | null
          leash_walk_quality?: string | null
          no_response?: string | null
          recovery_after_trigger?: string | null
          stop_response?: string | null
          tension_level?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_logs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      day_progress: {
        Row: {
          completed_exercises: string[] | null
          created_at: string
          day_id: number
          dog_id: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
          validated: boolean | null
        }
        Insert: {
          completed_exercises?: string[] | null
          created_at?: string
          day_id: number
          dog_id: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          validated?: boolean | null
        }
        Update: {
          completed_exercises?: string[] | null
          created_at?: string
          day_id?: number
          dog_id?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          validated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "day_progress_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_evaluations: {
        Row: {
          barks_frequently: string | null
          comfort_distance_meters: number | null
          created_at: string
          dog_id: string
          has_bitten: string | null
          holds_down: string | null
          holds_sit: string | null
          id: string
          jumps_on_people: string | null
          main_trigger: string | null
          problem_frequency: string | null
          problem_intensity: number | null
          reacts_to_dogs: string | null
          reacts_to_humans: string | null
          recovery_time: string | null
          responds_to_name: string | null
          stays_calm_on_mat: string | null
          tolerates_frustration: string | null
          tolerates_solitude: string | null
          user_id: string
          walks_without_pulling: string | null
        }
        Insert: {
          barks_frequently?: string | null
          comfort_distance_meters?: number | null
          created_at?: string
          dog_id: string
          has_bitten?: string | null
          holds_down?: string | null
          holds_sit?: string | null
          id?: string
          jumps_on_people?: string | null
          main_trigger?: string | null
          problem_frequency?: string | null
          problem_intensity?: number | null
          reacts_to_dogs?: string | null
          reacts_to_humans?: string | null
          recovery_time?: string | null
          responds_to_name?: string | null
          stays_calm_on_mat?: string | null
          tolerates_frustration?: string | null
          tolerates_solitude?: string | null
          user_id: string
          walks_without_pulling?: string | null
        }
        Update: {
          barks_frequently?: string | null
          comfort_distance_meters?: number | null
          created_at?: string
          dog_id?: string
          has_bitten?: string | null
          holds_down?: string | null
          holds_sit?: string | null
          id?: string
          jumps_on_people?: string | null
          main_trigger?: string | null
          problem_frequency?: string | null
          problem_intensity?: number | null
          reacts_to_dogs?: string | null
          reacts_to_humans?: string | null
          recovery_time?: string | null
          responds_to_name?: string | null
          stays_calm_on_mat?: string | null
          tolerates_frustration?: string | null
          tolerates_solitude?: string | null
          user_id?: string
          walks_without_pulling?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_evaluations_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_objectives: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          is_priority: boolean | null
          objective_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          is_priority?: boolean | null
          objective_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          is_priority?: boolean | null
          objective_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_objectives_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_problems: {
        Row: {
          comment: string | null
          created_at: string
          dog_id: string
          frequency: string | null
          id: string
          intensity: number | null
          problem_key: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dog_id: string
          frequency?: string | null
          id?: string
          intensity?: number | null
          problem_key: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          dog_id?: string
          frequency?: string | null
          id?: string
          intensity?: number | null
          problem_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_problems_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          activity_level: string | null
          adoption_date: string | null
          allergies: string | null
          alone_hours_per_day: number | null
          birth_date: string | null
          bite_history: boolean | null
          breed: string | null
          created_at: string
          current_treatments: string | null
          environment: string | null
          epilepsy: boolean | null
          excitement_level: number | null
          frustration_level: number | null
          has_children: boolean | null
          has_other_animals: boolean | null
          health_notes: string | null
          heart_problems: boolean | null
          id: string
          is_active: boolean | null
          is_mixed: boolean | null
          is_neutered: boolean | null
          joint_pain: boolean | null
          known_diseases: string | null
          muzzle_required: boolean | null
          name: string
          noise_sensitivity: number | null
          obedience_level: number | null
          origin: string | null
          overweight: boolean | null
          photo_url: string | null
          physical_limitations: string | null
          recovery_capacity: number | null
          separation_sensitivity: number | null
          sex: string | null
          size: string | null
          sociability_dogs: number | null
          sociability_humans: number | null
          updated_at: string
          user_id: string
          vet_restrictions: string | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          adoption_date?: string | null
          allergies?: string | null
          alone_hours_per_day?: number | null
          birth_date?: string | null
          bite_history?: boolean | null
          breed?: string | null
          created_at?: string
          current_treatments?: string | null
          environment?: string | null
          epilepsy?: boolean | null
          excitement_level?: number | null
          frustration_level?: number | null
          has_children?: boolean | null
          has_other_animals?: boolean | null
          health_notes?: string | null
          heart_problems?: boolean | null
          id?: string
          is_active?: boolean | null
          is_mixed?: boolean | null
          is_neutered?: boolean | null
          joint_pain?: boolean | null
          known_diseases?: string | null
          muzzle_required?: boolean | null
          name: string
          noise_sensitivity?: number | null
          obedience_level?: number | null
          origin?: string | null
          overweight?: boolean | null
          photo_url?: string | null
          physical_limitations?: string | null
          recovery_capacity?: number | null
          separation_sensitivity?: number | null
          sex?: string | null
          size?: string | null
          sociability_dogs?: number | null
          sociability_humans?: number | null
          updated_at?: string
          user_id: string
          vet_restrictions?: string | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          adoption_date?: string | null
          allergies?: string | null
          alone_hours_per_day?: number | null
          birth_date?: string | null
          bite_history?: boolean | null
          breed?: string | null
          created_at?: string
          current_treatments?: string | null
          environment?: string | null
          epilepsy?: boolean | null
          excitement_level?: number | null
          frustration_level?: number | null
          has_children?: boolean | null
          has_other_animals?: boolean | null
          health_notes?: string | null
          heart_problems?: boolean | null
          id?: string
          is_active?: boolean | null
          is_mixed?: boolean | null
          is_neutered?: boolean | null
          joint_pain?: boolean | null
          known_diseases?: string | null
          muzzle_required?: boolean | null
          name?: string
          noise_sensitivity?: number | null
          obedience_level?: number | null
          origin?: string | null
          overweight?: boolean | null
          photo_url?: string | null
          physical_limitations?: string | null
          recovery_capacity?: number | null
          separation_sensitivity?: number | null
          sex?: string | null
          size?: string | null
          sociability_dogs?: number | null
          sociability_humans?: number | null
          updated_at?: string
          user_id?: string
          vet_restrictions?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercise_sessions: {
        Row: {
          completed: boolean | null
          created_at: string
          day_id: number
          dog_id: string
          duration_actual: number | null
          ended_at: string | null
          exercise_id: string
          id: string
          repetitions_done: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          day_id: number
          dog_id: string
          duration_actual?: number | null
          ended_at?: string | null
          exercise_id: string
          id?: string
          repetitions_done?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          day_id?: number
          dog_id?: string
          duration_actual?: number | null
          ended_at?: string | null
          exercise_id?: string
          id?: string
          repetitions_done?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sessions_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
    }
    Enums: {
      app_role: "owner" | "educator"
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
      app_role: ["owner", "educator"],
    },
  },
} as const
