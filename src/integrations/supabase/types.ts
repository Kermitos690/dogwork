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
      admin_subscriptions: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          is_active: boolean
          notes: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      adopter_links: {
        Row: {
          adopter_user_id: string
          animal_id: string
          animal_name: string | null
          created_at: string
          id: string
          shelter_user_id: string
        }
        Insert: {
          adopter_user_id: string
          animal_id: string
          animal_name?: string | null
          created_at?: string
          id?: string
          shelter_user_id: string
        }
        Update: {
          adopter_user_id?: string
          animal_id?: string
          animal_name?: string | null
          created_at?: string
          id?: string
          shelter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adopter_links_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adopter_links_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_checkins: {
        Row: {
          adopter_user_id: string
          animal_id: string
          behavior_notes: string | null
          checkin_week: number
          concerns: string | null
          created_at: string
          due_date: string
          general_mood: string | null
          health_status: string | null
          highlights: string | null
          id: string
          photos: string[] | null
          shelter_user_id: string
          submitted_at: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          adopter_user_id: string
          animal_id: string
          behavior_notes?: string | null
          checkin_week: number
          concerns?: string | null
          created_at?: string
          due_date: string
          general_mood?: string | null
          health_status?: string | null
          highlights?: string | null
          id?: string
          photos?: string[] | null
          shelter_user_id: string
          submitted_at?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          adopter_user_id?: string
          animal_id?: string
          behavior_notes?: string | null
          checkin_week?: number
          concerns?: string | null
          created_at?: string
          due_date?: string
          general_mood?: string | null
          health_status?: string | null
          highlights?: string | null
          id?: string
          photos?: string[] | null
          shelter_user_id?: string
          submitted_at?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adoption_checkins_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_checkins_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_plan_entries: {
        Row: {
          adopter_user_id: string
          completed: boolean
          created_at: string
          id: string
          mood: string | null
          notes: string | null
          photos: string[] | null
          plan_id: string
          task_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          adopter_user_id: string
          completed?: boolean
          created_at?: string
          id?: string
          mood?: string | null
          notes?: string | null
          photos?: string[] | null
          plan_id: string
          task_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          adopter_user_id?: string
          completed?: boolean
          created_at?: string
          id?: string
          mood?: string | null
          notes?: string | null
          photos?: string[] | null
          plan_id?: string
          task_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adoption_plan_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "adoption_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_plan_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "adoption_plan_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_plan_tasks: {
        Row: {
          created_at: string
          description: string | null
          exercise_slug: string | null
          id: string
          plan_id: string
          sort_order: number
          task_type: string
          title: string
          week_number: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          exercise_slug?: string | null
          id?: string
          plan_id: string
          sort_order?: number
          task_type?: string
          title?: string
          week_number: number
        }
        Update: {
          created_at?: string
          description?: string | null
          exercise_slug?: string | null
          id?: string
          plan_id?: string
          sort_order?: number
          task_type?: string
          title?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "adoption_plan_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "adoption_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_plans: {
        Row: {
          adopter_user_id: string
          animal_id: string
          created_at: string
          description: string | null
          duration_weeks: number
          id: string
          objectives: Json
          shelter_user_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          adopter_user_id: string
          animal_id: string
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          objectives?: Json
          shelter_user_id: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          adopter_user_id?: string
          animal_id?: string
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          objectives?: Json
          shelter_user_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_plans_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_plans_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_updates: {
        Row: {
          adopter_email: string | null
          adopter_name: string | null
          animal_id: string
          created_at: string | null
          id: string
          message: string | null
          photo_url: string | null
          shelter_user_id: string
        }
        Insert: {
          adopter_email?: string | null
          adopter_name?: string | null
          animal_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          photo_url?: string | null
          shelter_user_id: string
        }
        Update: {
          adopter_email?: string | null
          adopter_name?: string | null
          animal_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          photo_url?: string | null
          shelter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_updates_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_updates_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_ledger: {
        Row: {
          balance_after: number
          created_at: string
          credits_delta: number
          description: string | null
          feature_code: string | null
          id: string
          metadata: Json | null
          operation_type: Database["public"]["Enums"]["ai_ledger_type"]
          provider_cost_usd: number | null
          public_price_chf: number | null
          status: string
          stripe_payment_id: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          credits_delta: number
          description?: string | null
          feature_code?: string | null
          id?: string
          metadata?: Json | null
          operation_type: Database["public"]["Enums"]["ai_ledger_type"]
          provider_cost_usd?: number | null
          public_price_chf?: number | null
          status?: string
          stripe_payment_id?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          credits_delta?: number
          description?: string | null
          feature_code?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: Database["public"]["Enums"]["ai_ledger_type"]
          provider_cost_usd?: number | null
          public_price_chf?: number | null
          status?: string
          stripe_payment_id?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_ledger_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "ai_feature_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ai_credit_ledger_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "ai_feature_catalog_public"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ai_credit_ledger_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "ai_credit_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_packs: {
        Row: {
          cost_estimate_usd: number | null
          created_at: string
          credits: number
          description: string | null
          id: string
          is_active: boolean
          label: string
          margin_estimate: number | null
          price_chf: number
          slug: string
          sort_order: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          cost_estimate_usd?: number | null
          created_at?: string
          credits: number
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          margin_estimate?: number | null
          price_chf: number
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_estimate_usd?: number | null
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          margin_estimate?: number | null
          price_chf?: number
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_credit_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_consumed: number
          lifetime_purchased: number
          lifetime_refunded: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_consumed?: number
          lifetime_purchased?: number
          lifetime_refunded?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_consumed?: number
          lifetime_purchased?: number
          lifetime_refunded?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feature_catalog: {
        Row: {
          code: string
          cost_estimate_avg_usd: number
          cost_estimate_max_usd: number
          cost_estimate_min_usd: number
          created_at: string
          credits_cost: number
          description: string | null
          id: string
          is_active: boolean
          label: string
          margin_target: number
          model: string
          updated_at: string
        }
        Insert: {
          code: string
          cost_estimate_avg_usd?: number
          cost_estimate_max_usd?: number
          cost_estimate_min_usd?: number
          created_at?: string
          credits_cost?: number
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          margin_target?: number
          model?: string
          updated_at?: string
        }
        Update: {
          code?: string
          cost_estimate_avg_usd?: number
          cost_estimate_max_usd?: number
          cost_estimate_min_usd?: number
          created_at?: string
          credits_cost?: number
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          margin_target?: number
          model?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_plan_quotas: {
        Row: {
          created_at: string
          daily_limit: number | null
          discount_percent: number
          id: string
          monthly_credits: number
          per_action_limit: number | null
          plan_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          discount_percent?: number
          id?: string
          monthly_credits?: number
          per_action_limit?: number | null
          plan_slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          discount_percent?: number
          id?: string
          monthly_credits?: number
          per_action_limit?: number | null
          plan_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_pricing_config: {
        Row: {
          description: string | null
          id: string
          key: string
          label: string | null
          updated_at: string
          value: number
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          label?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          label?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
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
      billing_events: {
        Row: {
          connected_account_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          processing_error: string | null
          processing_status: string
          stripe_event_id: string
          user_id: string | null
        }
        Insert: {
          connected_account_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          processing_error?: string | null
          processing_status?: string
          stripe_event_id: string
          user_id?: string | null
        }
        Update: {
          connected_account_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processing_error?: string | null
          processing_status?: string
          stripe_event_id?: string
          user_id?: string | null
        }
        Relationships: []
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
      coach_calendar_events: {
        Row: {
          client_user_id: string | null
          coach_user_id: string
          course_id: string | null
          created_at: string
          description: string | null
          dog_id: string | null
          end_at: string
          event_type: string
          id: string
          is_available_slot: boolean
          location: string | null
          start_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_user_id?: string | null
          coach_user_id: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          dog_id?: string | null
          end_at: string
          event_type?: string
          id?: string
          is_available_slot?: boolean
          location?: string | null
          start_at: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          client_user_id?: string | null
          coach_user_id?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          dog_id?: string | null
          end_at?: string
          event_type?: string
          id?: string
          is_available_slot?: boolean
          location?: string | null
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_calendar_events_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
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
      coach_stripe_data: {
        Row: {
          created_at: string
          id: string
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_admin_notes: {
        Row: {
          admin_user_id: string
          content: string
          course_id: string
          created_at: string
          educator_user_id: string
          id: string
          note_type: string
          read: boolean
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          content: string
          course_id: string
          created_at?: string
          educator_user_id: string
          id?: string
          note_type?: string
          read?: boolean
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          content?: string
          course_id?: string
          created_at?: string
          educator_user_id?: string
          id?: string
          note_type?: string
          read?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_admin_notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bookings: {
        Row: {
          amount_cents: number | null
          commission_cents: number | null
          course_id: string
          created_at: string | null
          dog_id: string | null
          educator_note: string | null
          id: string
          payment_status: string | null
          reviewed_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          commission_cents?: number | null
          course_id: string
          created_at?: string | null
          dog_id?: string | null
          educator_note?: string | null
          id?: string
          payment_status?: string | null
          reviewed_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          commission_cents?: number | null
          course_id?: string
          created_at?: string | null
          dog_id?: string | null
          educator_note?: string | null
          id?: string
          payment_status?: string | null
          reviewed_at?: string | null
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
          {
            foreignKeyName: "course_bookings_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
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
          chip_id: string | null
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
          chip_id?: string | null
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
          chip_id?: string | null
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
      educator_commercial_rules: {
        Row: {
          annual_fee_chf: number
          created_at: string
          id: string
          is_active: boolean
          management_fee_percent: number
          refuge_referral_discount_percent: number
          stripe_coupon_id: string | null
          updated_at: string
        }
        Insert: {
          annual_fee_chf?: number
          created_at?: string
          id?: string
          is_active?: boolean
          management_fee_percent?: number
          refuge_referral_discount_percent?: number
          stripe_coupon_id?: string | null
          updated_at?: string
        }
        Update: {
          annual_fee_chf?: number
          created_at?: string
          id?: string
          is_active?: boolean
          management_fee_percent?: number
          refuge_referral_discount_percent?: number
          stripe_coupon_id?: string | null
          updated_at?: string
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
          body_positioning: Json | null
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
          min_tier: string
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
          troubleshooting: Json | null
          tutorial_steps: Json | null
          validation_protocol: string | null
          vigilance: string | null
          voice_commands: Json | null
        }
        Insert: {
          adaptations?: Json | null
          age_recommendation?: string | null
          body_positioning?: Json | null
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
          min_tier?: string
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
          troubleshooting?: Json | null
          tutorial_steps?: Json | null
          validation_protocol?: string | null
          vigilance?: string | null
          voice_commands?: Json | null
        }
        Update: {
          adaptations?: Json | null
          age_recommendation?: string | null
          body_positioning?: Json | null
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
          min_tier?: string
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
          troubleshooting?: Json | null
          tutorial_steps?: Json | null
          validation_protocol?: string | null
          vigilance?: string | null
          voice_commands?: Json | null
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
      image_generation_queue: {
        Row: {
          created_at: string
          error_message: string | null
          exercise_id: string
          exercise_name: string
          exercise_objective: string | null
          exercise_slug: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          exercise_id: string
          exercise_name: string
          exercise_objective?: string | null
          exercise_slug: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          exercise_id?: string
          exercise_name?: string
          exercise_objective?: string | null
          exercise_slug?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_generation_queue_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
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
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
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
      shelter_activity_log: {
        Row: {
          action_type: string
          animal_id: string | null
          created_at: string
          description: string
          employee_id: string | null
          employee_name: string
          employee_role: string
          id: string
          shelter_user_id: string
        }
        Insert: {
          action_type?: string
          animal_id?: string | null
          created_at?: string
          description?: string
          employee_id?: string | null
          employee_name?: string
          employee_role?: string
          id?: string
          shelter_user_id: string
        }
        Update: {
          action_type?: string
          animal_id?: string | null
          created_at?: string
          description?: string
          employee_id?: string | null
          employee_name?: string
          employee_role?: string
          id?: string
          shelter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelter_activity_log_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_activity_log_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_activity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "shelter_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_activity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "shelter_employees_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shelter_animal_evaluations: {
        Row: {
          adoption_ready: boolean | null
          animal_id: string
          bite_risk: string | null
          coach_user_id: string
          created_at: string
          energy_level: number | null
          fear_level: number | null
          general_notes: string | null
          id: string
          leash_behavior: string | null
          obedience_basics: string | null
          reactivity_level: number | null
          recommended_profile: string | null
          resource_guarding: string | null
          separation_anxiety: string | null
          shelter_user_id: string
          sociability_dogs: number | null
          sociability_humans: number | null
          special_needs: string | null
          training_notes: string | null
          updated_at: string
        }
        Insert: {
          adoption_ready?: boolean | null
          animal_id: string
          bite_risk?: string | null
          coach_user_id: string
          created_at?: string
          energy_level?: number | null
          fear_level?: number | null
          general_notes?: string | null
          id?: string
          leash_behavior?: string | null
          obedience_basics?: string | null
          reactivity_level?: number | null
          recommended_profile?: string | null
          resource_guarding?: string | null
          separation_anxiety?: string | null
          shelter_user_id: string
          sociability_dogs?: number | null
          sociability_humans?: number | null
          special_needs?: string | null
          training_notes?: string | null
          updated_at?: string
        }
        Update: {
          adoption_ready?: boolean | null
          animal_id?: string
          bite_risk?: string | null
          coach_user_id?: string
          created_at?: string
          energy_level?: number | null
          fear_level?: number | null
          general_notes?: string | null
          id?: string
          leash_behavior?: string | null
          obedience_basics?: string | null
          reactivity_level?: number | null
          recommended_profile?: string | null
          resource_guarding?: string | null
          separation_anxiety?: string | null
          shelter_user_id?: string
          sociability_dogs?: number | null
          sociability_humans?: number | null
          special_needs?: string | null
          training_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelter_animal_evaluations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_animal_evaluations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shelter_animals: {
        Row: {
          adopter_email: string | null
          adopter_name: string | null
          arrival_date: string
          behavior_notes: string | null
          breed: string | null
          chip_id: string | null
          created_at: string
          departure_date: string | null
          departure_reason: string | null
          description: string | null
          estimated_age: string | null
          health_notes: string | null
          id: string
          is_sterilized: boolean | null
          name: string
          photo_url: string | null
          sex: string | null
          species: string
          status: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          adopter_email?: string | null
          adopter_name?: string | null
          arrival_date?: string
          behavior_notes?: string | null
          breed?: string | null
          chip_id?: string | null
          created_at?: string
          departure_date?: string | null
          departure_reason?: string | null
          description?: string | null
          estimated_age?: string | null
          health_notes?: string | null
          id?: string
          is_sterilized?: boolean | null
          name: string
          photo_url?: string | null
          sex?: string | null
          species?: string
          status?: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          adopter_email?: string | null
          adopter_name?: string | null
          arrival_date?: string
          behavior_notes?: string | null
          breed?: string | null
          chip_id?: string | null
          created_at?: string
          departure_date?: string | null
          departure_reason?: string | null
          description?: string | null
          estimated_age?: string | null
          health_notes?: string | null
          id?: string
          is_sterilized?: boolean | null
          name?: string
          photo_url?: string | null
          sex?: string | null
          species?: string
          status?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      shelter_coaches: {
        Row: {
          coach_user_id: string
          created_at: string
          id: string
          notes: string | null
          shelter_user_id: string
          specialty: string | null
          status: string
          updated_at: string
        }
        Insert: {
          coach_user_id: string
          created_at?: string
          id?: string
          notes?: string | null
          shelter_user_id: string
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          coach_user_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          shelter_user_id?: string
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      shelter_employees: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          hashed_pin: string | null
          id: string
          is_active: boolean
          job_title: string | null
          name: string
          phone: string | null
          role: string
          shelter_user_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          hashed_pin?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          name?: string
          phone?: string | null
          role?: string
          shelter_user_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          hashed_pin?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          name?: string
          phone?: string | null
          role?: string
          shelter_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shelter_observations: {
        Row: {
          animal_id: string
          author_id: string
          content: string
          created_at: string
          employee_id: string | null
          employee_name: string | null
          id: string
          observation_date: string
          observation_type: string
        }
        Insert: {
          animal_id: string
          author_id: string
          content?: string
          created_at?: string
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          observation_date?: string
          observation_type?: string
        }
        Update: {
          animal_id?: string
          author_id?: string
          content?: string
          created_at?: string
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          observation_date?: string
          observation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelter_observations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_observations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_observations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "shelter_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_observations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "shelter_employees_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shelter_profiles: {
        Row: {
          address: string | null
          checkin_frequency_weeks: number | null
          checkin_total_weeks: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_type: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          checkin_frequency_weeks?: number | null
          checkin_total_weeks?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_type?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          checkin_frequency_weeks?: number | null
          checkin_total_weeks?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_type?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shelter_spaces: {
        Row: {
          capacity: number | null
          color: string | null
          created_at: string
          current_animal_id: string | null
          height: number | null
          id: string
          name: string
          notes: string | null
          position_x: number | null
          position_y: number | null
          shelter_user_id: string
          space_type: string
          updated_at: string
          width: number | null
        }
        Insert: {
          capacity?: number | null
          color?: string | null
          created_at?: string
          current_animal_id?: string | null
          height?: number | null
          id?: string
          name?: string
          notes?: string | null
          position_x?: number | null
          position_y?: number | null
          shelter_user_id: string
          space_type?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          capacity?: number | null
          color?: string | null
          created_at?: string
          current_animal_id?: string | null
          height?: number | null
          id?: string
          name?: string
          notes?: string | null
          position_x?: number | null
          position_y?: number | null
          shelter_user_id?: string
          space_type?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shelter_spaces_current_animal_id_fkey"
            columns: ["current_animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_spaces_current_animal_id_fkey"
            columns: ["current_animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_tier: string
          email: string | null
          id: string
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_tier?: string
          email?: string | null
          id?: string
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_tier?: string
          email?: string | null
          id?: string
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plan_prices: {
        Row: {
          billing_period: string
          created_at: string
          id: string
          is_public: boolean
          notes: string | null
          plan_code: string
          price_chf: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          billing_period: string
          created_at?: string
          id?: string
          is_public?: boolean
          notes?: string | null
          plan_code: string
          price_chf?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string
          id?: string
          is_public?: boolean
          notes?: string | null
          plan_code?: string
          price_chf?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_prices_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          base_exercise_limit: number | null
          code: string
          created_at: string
          includes_28_day_plans: boolean
          includes_base_exercises: boolean
          is_active: boolean
          max_dogs: number
          monthly_ai_credits: number
          name: string
          updated_at: string
        }
        Insert: {
          base_exercise_limit?: number | null
          code: string
          created_at?: string
          includes_28_day_plans?: boolean
          includes_base_exercises?: boolean
          is_active?: boolean
          max_dogs?: number
          monthly_ai_credits?: number
          name: string
          updated_at?: string
        }
        Update: {
          base_exercise_limit?: number | null
          code?: string
          created_at?: string
          includes_28_day_plans?: boolean
          includes_base_exercises?: boolean
          is_active?: boolean
          max_dogs?: number
          monthly_ai_credits?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          title?: string
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
          dog_id: string | null
          frequency: string
          id: string
          is_active: boolean
          is_template: boolean
          plan_type: string
          precautions: Json
          security_level: string
          summary: string
          template_category: string | null
          template_description: string | null
          template_tier: string | null
          title: string
          total_days: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          average_duration?: string
          axes?: Json
          created_at?: string
          days?: Json
          dog_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          is_template?: boolean
          plan_type?: string
          precautions?: Json
          security_level?: string
          summary?: string
          template_category?: string | null
          template_description?: string | null
          template_tier?: string | null
          title?: string
          total_days?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          average_duration?: string
          axes?: Json
          created_at?: string
          days?: Json
          dog_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          is_template?: boolean
          plan_type?: string
          precautions?: Json
          security_level?: string
          summary?: string
          template_category?: string | null
          template_description?: string | null
          template_tier?: string | null
          title?: string
          total_days?: number
          updated_at?: string
          user_id?: string | null
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
      usage_tracking: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          period_end: string
          period_start: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          accent_color: string
          created_at: string
          hide_chatbot: boolean
          hide_guided_tour: boolean
          hide_read_aloud: boolean
          id: string
          theme_mode: string
          updated_at: string
          user_id: string
          visible_sections: Json
        }
        Insert: {
          accent_color?: string
          created_at?: string
          hide_chatbot?: boolean
          hide_guided_tour?: boolean
          hide_read_aloud?: boolean
          id?: string
          theme_mode?: string
          updated_at?: string
          user_id: string
          visible_sections?: Json
        }
        Update: {
          accent_color?: string
          created_at?: string
          hide_chatbot?: boolean
          hide_guided_tour?: boolean
          hide_read_aloud?: boolean
          id?: string
          theme_mode?: string
          updated_at?: string
          user_id?: string
          visible_sections?: Json
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
      ai_credit_packs_public: {
        Row: {
          credits: number | null
          description: string | null
          id: string | null
          is_active: boolean | null
          label: string | null
          price_chf: number | null
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          credits?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          price_chf?: number | null
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          credits?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          price_chf?: number | null
          slug?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      ai_feature_catalog_public: {
        Row: {
          code: string | null
          credits_cost: number | null
          description: string | null
          is_active: boolean | null
          label: string | null
          model: string | null
        }
        Insert: {
          code?: string | null
          credits_cost?: number | null
          description?: string | null
          is_active?: boolean | null
          label?: string | null
          model?: string | null
        }
        Update: {
          code?: string | null
          credits_cost?: number | null
          description?: string | null
          is_active?: boolean | null
          label?: string | null
          model?: string | null
        }
        Relationships: []
      }
      shelter_animals_safe: {
        Row: {
          arrival_date: string | null
          behavior_notes: string | null
          breed: string | null
          created_at: string | null
          departure_date: string | null
          departure_reason: string | null
          description: string | null
          estimated_age: string | null
          id: string | null
          is_sterilized: boolean | null
          name: string | null
          photo_url: string | null
          sex: string | null
          species: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          arrival_date?: string | null
          behavior_notes?: string | null
          breed?: string | null
          created_at?: string | null
          departure_date?: string | null
          departure_reason?: string | null
          description?: string | null
          estimated_age?: string | null
          id?: string | null
          is_sterilized?: boolean | null
          name?: string | null
          photo_url?: string | null
          sex?: string | null
          species?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          arrival_date?: string | null
          behavior_notes?: string | null
          breed?: string | null
          created_at?: string | null
          departure_date?: string | null
          departure_reason?: string | null
          description?: string | null
          estimated_age?: string | null
          id?: string | null
          is_sterilized?: boolean | null
          name?: string | null
          photo_url?: string | null
          sex?: string | null
          species?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      shelter_employees_safe: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          job_title: string | null
          name: string | null
          phone: string | null
          role: string | null
          shelter_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          shelter_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          shelter_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shelter_profiles_public: {
        Row: {
          description: string | null
          id: string | null
          name: string | null
          organization_type: string | null
          user_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          name?: string | null
          organization_type?: string | null
          user_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string | null
          name?: string | null
          organization_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_credit_kpis: {
        Row: {
          avg_basket_chf: number | null
          revenue_chf: number | null
          total_credited: number | null
          total_credits_sold: number | null
          total_orders: number | null
          unique_buyers: number | null
        }
        Relationships: []
      }
      v_credit_orders_admin: {
        Row: {
          amount_chf: number | null
          created_at: string | null
          credits: number | null
          description: string | null
          feature_code: string | null
          id: string | null
          operation_type: Database["public"]["Enums"]["ai_ledger_type"] | null
          status: string | null
          stripe_payment_id: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_ledger_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "ai_feature_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ai_credit_ledger_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "ai_feature_catalog_public"
            referencedColumns: ["code"]
          },
        ]
      }
      v_credit_orders_daily: {
        Row: {
          credited: number | null
          credits_sold: number | null
          daily_revenue: number | null
          day: string | null
          orders: number | null
        }
        Relationships: []
      }
      v_my_credit_orders: {
        Row: {
          amount_chf: number | null
          created_at: string | null
          credits: number | null
          description: string | null
          id: string | null
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount_chf?: number | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount_chf?: number | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: []
      }
      v_my_wallet_daily_activity: {
        Row: {
          credits_in: number | null
          credits_out: number | null
          day: string | null
          operations: number | null
        }
        Relationships: []
      }
      v_my_wallet_summary: {
        Row: {
          balance: number | null
          last_activity: string | null
          total_in: number | null
          total_out: number | null
          total_refunded: number | null
        }
        Insert: {
          balance?: number | null
          last_activity?: string | null
          total_in?: number | null
          total_out?: number | null
          total_refunded?: number | null
        }
        Update: {
          balance?: number | null
          last_activity?: string | null
          total_in?: number | null
          total_out?: number | null
          total_refunded?: number | null
        }
        Relationships: []
      }
      v_shelter_spaces_grid: {
        Row: {
          animal_breed: string | null
          animal_name: string | null
          animal_species: string | null
          animal_status: string | null
          capacity: number | null
          color: string | null
          current_animal_id: string | null
          height: number | null
          id: string | null
          name: string | null
          notes: string | null
          position_x: number | null
          position_y: number | null
          shelter_user_id: string | null
          space_type: string | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shelter_spaces_current_animal_id_fkey"
            columns: ["current_animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelter_spaces_current_animal_id_fkey"
            columns: ["current_animal_id"]
            isOneToOne: false
            referencedRelation: "shelter_animals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      v_shelter_spaces_occupancy: {
        Row: {
          free: number | null
          occupancy_pct: number | null
          occupied: number | null
          shelter_user_id: string | null
          space_type: string | null
          total: number | null
        }
        Relationships: []
      }
      v_shelter_spaces_stats: {
        Row: {
          free_spaces: number | null
          occupancy_pct: number | null
          occupied_spaces: number | null
          space_types: number | null
          total_capacity: number | null
          total_spaces: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ai_economy_summary: { Args: never; Returns: Json }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          roles: string[]
          user_id: string
        }[]
      }
      assign_animal_to_shelter_space: {
        Args: { _animal_id: string; _space_id: string }
        Returns: undefined
      }
      credit_ai_wallet: {
        Args: {
          _credits: number
          _description?: string
          _metadata?: Json
          _operation_type: Database["public"]["Enums"]["ai_ledger_type"]
          _public_price_chf?: number
          _stripe_payment_id?: string
          _user_id: string
        }
        Returns: number
      }
      debit_ai_credits: {
        Args: {
          _credits: number
          _feature_code: string
          _metadata?: Json
          _provider_cost_usd?: number
          _user_id: string
        }
        Returns: boolean
      }
      end_shelter_space_assignment: {
        Args: { _space_id: string }
        Returns: undefined
      }
      ensure_ai_wallet: { Args: { _user_id: string }; Returns: string }
      fix_exercise_json_encoding: { Args: never; Returns: Json }
      get_ai_balance: { Args: { _user_id: string }; Returns: number }
      get_coach_profile_safe: {
        Args: { target_user_id: string }
        Returns: {
          bio: string
          created_at: string
          display_name: string
          id: string
          specialty: string
          stripe_onboarding_complete: boolean
          updated_at: string
          user_id: string
        }[]
      }
      get_employee_shelter_id: { Args: { _user_id: string }; Returns: string }
      get_exercise_for_user: { Args: { _slug: string }; Returns: Json }
      get_unenriched_exercises: {
        Args: { batch_limit?: number; batch_offset?: number }
        Returns: {
          adaptations: Json | null
          age_recommendation: string | null
          body_positioning: Json | null
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
          min_tier: string
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
          troubleshooting: Json | null
          tutorial_steps: Json | null
          validation_protocol: string | null
          vigilance: string | null
          voice_commands: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "exercises"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_tier: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: { Args: { p_feature_key: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_educator: { Args: never; Returns: boolean }
      is_shelter: { Args: never; Returns: boolean }
      is_shelter_employee: { Args: never; Returns: boolean }
      search_animal_by_chip: {
        Args: { _chip_id: string }
        Returns: {
          breed: string
          chip_id: string
          estimated_age: string
          id: string
          name: string
          photo_url: string
          sex: string
          shelter_user_id: string
          species: string
          status: string
        }[]
      }
      search_linkable_users: {
        Args: { _query: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      sync_exercise_stats: { Args: never; Returns: Json }
      sync_exercises_from_catalog_data: {
        Args: { _catalog: Json }
        Returns: Json
      }
      tier_meets_minimum: {
        Args: { _min_tier: string; _user_tier: string }
        Returns: boolean
      }
      verify_employee_pin: {
        Args: { _employee_id: string; _pin: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_ledger_type:
        | "consumption"
        | "purchase"
        | "bonus"
        | "refund"
        | "admin_adjustment"
        | "monthly_grant"
      app_role: "owner" | "educator" | "admin" | "shelter" | "shelter_employee"
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
      ai_ledger_type: [
        "consumption",
        "purchase",
        "bonus",
        "refund",
        "admin_adjustment",
        "monthly_grant",
      ],
      app_role: ["owner", "educator", "admin", "shelter", "shelter_employee"],
    },
  },
} as const
