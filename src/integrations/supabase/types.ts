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
    PostgrestVersion: "14.4"
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
          human_reaction_level: number | null
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
          human_reaction_level?: number | null
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
          human_reaction_level?: number | null
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
      client_links: {
        Row: {
          client_user_id: string
          coach_user_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          client_user_id: string
          coach_user_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          client_user_id?: string
          coach_user_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      coach_notes: {
        Row: {
          client_user_id: string | null
          coach_user_id: string
          content: string
          created_at: string
          dog_id: string | null
          id: string
          note_type: string
          priority_level: string
          title: string
          training_plan_id: string | null
          updated_at: string
        }
        Insert: {
          client_user_id?: string | null
          coach_user_id: string
          content?: string
          created_at?: string
          dog_id?: string | null
          id?: string
          note_type?: string
          priority_level?: string
          title?: string
          training_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          client_user_id?: string | null
          coach_user_id?: string
          content?: string
          created_at?: string
          dog_id?: string | null
          id?: string
          note_type?: string
          priority_level?: string
          title?: string
          training_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_bookings: {
        Row: {
          amount_cents: number | null
          commission_cents: number | null
          course_id: string
          created_at: string | null
          id: string
          payment_status: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          commission_cents?: number | null
          course_id: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          commission_cents?: number | null
          course_id?: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_bookings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string | null
          educator_user_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string | null
          educator_user_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string | null
          educator_user_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          address: string | null
          approval_status: string
          category: string | null
          commission_rate: number
          created_at: string | null
          description: string | null
          dog_level: string | null
          duration_minutes: number | null
          educator_user_id: string
          id: string
          is_active: boolean | null
          location: string | null
          max_participants: number | null
          next_session_at: string | null
          price_cents: number
          title: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string
          category?: string | null
          commission_rate?: number
          created_at?: string | null
          description?: string | null
          dog_level?: string | null
          duration_minutes?: number | null
          educator_user_id: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          next_session_at?: string | null
          price_cents?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string
          category?: string | null
          commission_rate?: number
          created_at?: string | null
          description?: string | null
          dog_level?: string | null
          duration_minutes?: number | null
          educator_user_id?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          next_session_at?: string | null
          price_cents?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
      exercise_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_professional: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_professional?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_professional?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
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
      exercises: {
        Row: {
          adaptations: Json | null
          age_recommendation: string | null
          category_id: string
          cognitive_load: number | null
          compatible_muzzle: boolean | null
          compatible_puppy: boolean | null
          compatible_reactivity: boolean | null
          compatible_senior: boolean | null
          contraindications: Json | null
          cover_image: string | null
          created_at: string | null
          dedication: string | null
          description: string | null
          difficulty: number | null
          duration: string | null
          environment: string | null
          equipment: string[] | null
          exercise_type: string | null
          frequency: string | null
          health_precautions: Json | null
          id: string
          intensity_level: number | null
          is_professional: boolean | null
          level: string | null
          mistakes: Json | null
          name: string
          objective: string | null
          physical_load: number | null
          precautions: Json | null
          prerequisites: string[] | null
          priority_axis: string[] | null
          progression_next: string | null
          regression_simplified: string | null
          repetitions: string | null
          secondary_benefits: string[] | null
          short_instruction: string | null
          short_title: string | null
          slug: string
          sort_order: number | null
          steps: Json | null
          stop_criteria: string | null
          success_criteria: string | null
          suitable_profiles: Json | null
          summary: string | null
          tags: string[] | null
          target_breeds: string[] | null
          target_problems: string[] | null
          tutorial_steps: Json | null
          vigilance: string | null
        }
        Insert: {
          adaptations?: Json | null
          age_recommendation?: string | null
          category_id: string
          cognitive_load?: number | null
          compatible_muzzle?: boolean | null
          compatible_puppy?: boolean | null
          compatible_reactivity?: boolean | null
          compatible_senior?: boolean | null
          contraindications?: Json | null
          cover_image?: string | null
          created_at?: string | null
          dedication?: string | null
          description?: string | null
          difficulty?: number | null
          duration?: string | null
          environment?: string | null
          equipment?: string[] | null
          exercise_type?: string | null
          frequency?: string | null
          health_precautions?: Json | null
          id?: string
          intensity_level?: number | null
          is_professional?: boolean | null
          level?: string | null
          mistakes?: Json | null
          name: string
          objective?: string | null
          physical_load?: number | null
          precautions?: Json | null
          prerequisites?: string[] | null
          priority_axis?: string[] | null
          progression_next?: string | null
          regression_simplified?: string | null
          repetitions?: string | null
          secondary_benefits?: string[] | null
          short_instruction?: string | null
          short_title?: string | null
          slug: string
          sort_order?: number | null
          steps?: Json | null
          stop_criteria?: string | null
          success_criteria?: string | null
          suitable_profiles?: Json | null
          summary?: string | null
          tags?: string[] | null
          target_breeds?: string[] | null
          target_problems?: string[] | null
          tutorial_steps?: Json | null
          vigilance?: string | null
        }
        Update: {
          adaptations?: Json | null
          age_recommendation?: string | null
          category_id?: string
          cognitive_load?: number | null
          compatible_muzzle?: boolean | null
          compatible_puppy?: boolean | null
          compatible_reactivity?: boolean | null
          compatible_senior?: boolean | null
          contraindications?: Json | null
          cover_image?: string | null
          created_at?: string | null
          dedication?: string | null
          description?: string | null
          difficulty?: number | null
          duration?: string | null
          environment?: string | null
          equipment?: string[] | null
          exercise_type?: string | null
          frequency?: string | null
          health_precautions?: Json | null
          id?: string
          intensity_level?: number | null
          is_professional?: boolean | null
          level?: string | null
          mistakes?: Json | null
          name?: string
          objective?: string | null
          physical_load?: number | null
          precautions?: Json | null
          prerequisites?: string[] | null
          priority_axis?: string[] | null
          progression_next?: string | null
          regression_simplified?: string | null
          repetitions?: string | null
          secondary_benefits?: string[] | null
          short_instruction?: string | null
          short_title?: string | null
          slug?: string
          sort_order?: number | null
          steps?: Json | null
          stop_criteria?: string | null
          success_criteria?: string | null
          suitable_profiles?: Json | null
          summary?: string | null
          tags?: string[] | null
          target_breeds?: string[] | null
          target_problems?: string[] | null
          tutorial_steps?: Json | null
          vigilance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          completed: boolean
          created_at: string
          day_id: number | null
          dog_id: string
          dog_reaction: string | null
          entry_date: string
          focus_quality: string | null
          id: string
          incidents: string | null
          leash_quality: string | null
          no_quality: string | null
          notes: string | null
          recovery_time: string | null
          stop_quality: string | null
          success_level: string | null
          tension_level: number | null
          triggers_encountered: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          day_id?: number | null
          dog_id: string
          dog_reaction?: string | null
          entry_date?: string
          focus_quality?: string | null
          id?: string
          incidents?: string | null
          leash_quality?: string | null
          no_quality?: string | null
          notes?: string | null
          recovery_time?: string | null
          stop_quality?: string | null
          success_level?: string | null
          tension_level?: number | null
          triggers_encountered?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          day_id?: number | null
          dog_id?: string
          dog_reaction?: string | null
          entry_date?: string
          focus_quality?: string | null
          id?: string
          incidents?: string | null
          leash_quality?: string | null
          no_quality?: string | null
          notes?: string | null
          recovery_time?: string | null
          stop_quality?: string | null
          success_level?: string | null
          tension_level?: number | null
          triggers_encountered?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_adjustments: {
        Row: {
          adjustment_reason: string
          adjustment_type: string
          applied: boolean
          coach_user_id: string
          created_at: string
          dog_id: string
          id: string
          recommendation_text: string
          training_plan_id: string
        }
        Insert: {
          adjustment_reason?: string
          adjustment_type?: string
          applied?: boolean
          coach_user_id: string
          created_at?: string
          dog_id: string
          id?: string
          recommendation_text?: string
          training_plan_id: string
        }
        Update: {
          adjustment_reason?: string
          adjustment_type?: string
          applied?: boolean
          coach_user_id?: string
          created_at?: string
          dog_id?: string
          id?: string
          recommendation_text?: string
          training_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_adjustments_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_adjustments_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_alerts: {
        Row: {
          alert_type: string
          client_user_id: string
          coach_user_id: string | null
          created_at: string
          description: string
          dog_id: string
          id: string
          resolved: boolean
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type?: string
          client_user_id: string
          coach_user_id?: string | null
          created_at?: string
          description?: string
          dog_id: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Update: {
          alert_type?: string
          client_user_id?: string
          coach_user_id?: string | null
          created_at?: string
          description?: string
          dog_id?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_alerts_dog_id_fkey"
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
      training_plans: {
        Row: {
          average_duration: string
          axes: Json
          created_at: string
          days: Json
          dog_id: string
          frequency: string
          id: string
          is_active: boolean
          plan_type: string
          precautions: Json
          security_level: string
          summary: string
          title: string
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_duration?: string
          axes?: Json
          created_at?: string
          days?: Json
          dog_id: string
          frequency?: string
          id?: string
          is_active?: boolean
          plan_type?: string
          precautions?: Json
          security_level?: string
          summary?: string
          title?: string
          total_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_duration?: string
          axes?: Json
          created_at?: string
          days?: Json
          dog_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          plan_type?: string
          precautions?: Json
          security_level?: string
          summary?: string
          title?: string
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
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
      is_admin: { Args: never; Returns: boolean }
      is_educator: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "educator" | "admin"
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
      app_role: ["owner", "educator", "admin"],
    },
  },
} as const
