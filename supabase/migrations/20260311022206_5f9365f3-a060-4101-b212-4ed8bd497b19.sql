
-- Update app_role enum to add 'educator' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'educator';

-- Coach profiles table
CREATE TABLE public.coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  specialty text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches can view own profile" ON public.coach_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches can insert own profile" ON public.coach_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches can update own profile" ON public.coach_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Client links table
CREATE TABLE public.client_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_user_id, client_user_id)
);
ALTER TABLE public.client_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches can view their links" ON public.client_links FOR SELECT USING (auth.uid() = coach_user_id OR auth.uid() = client_user_id);
CREATE POLICY "Coaches can insert links" ON public.client_links FOR INSERT WITH CHECK (auth.uid() = coach_user_id);
CREATE POLICY "Coaches can update links" ON public.client_links FOR UPDATE USING (auth.uid() = coach_user_id);
CREATE POLICY "Coaches can delete links" ON public.client_links FOR DELETE USING (auth.uid() = coach_user_id);

-- Coach notes table
CREATE TABLE public.coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES public.dogs(id) ON DELETE CASCADE,
  training_plan_id uuid REFERENCES public.training_plans(id) ON DELETE SET NULL,
  note_type text NOT NULL DEFAULT 'observation',
  priority_level text NOT NULL DEFAULT 'normal',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches can view own notes" ON public.coach_notes FOR SELECT USING (auth.uid() = coach_user_id);
CREATE POLICY "Coaches can insert notes" ON public.coach_notes FOR INSERT WITH CHECK (auth.uid() = coach_user_id);
CREATE POLICY "Coaches can update notes" ON public.coach_notes FOR UPDATE USING (auth.uid() = coach_user_id);
CREATE POLICY "Coaches can delete notes" ON public.coach_notes FOR DELETE USING (auth.uid() = coach_user_id);

-- Plan adjustments table
CREATE TABLE public.plan_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  training_plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL DEFAULT 'recommendation',
  adjustment_reason text NOT NULL DEFAULT '',
  recommendation_text text NOT NULL DEFAULT '',
  applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches can view own adjustments" ON public.plan_adjustments FOR SELECT USING (auth.uid() = coach_user_id);
CREATE POLICY "Coaches can insert adjustments" ON public.plan_adjustments FOR INSERT WITH CHECK (auth.uid() = coach_user_id);
CREATE POLICY "Coaches can update adjustments" ON public.plan_adjustments FOR UPDATE USING (auth.uid() = coach_user_id);

-- Professional alerts table
CREATE TABLE public.professional_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  alert_type text NOT NULL DEFAULT 'warning',
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.professional_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches can view alerts for their clients" ON public.professional_alerts FOR SELECT USING (auth.uid() = coach_user_id OR auth.uid() = client_user_id);
CREATE POLICY "Coaches can insert alerts" ON public.professional_alerts FOR INSERT WITH CHECK (auth.uid() = coach_user_id);
CREATE POLICY "Coaches can update alerts" ON public.professional_alerts FOR UPDATE USING (auth.uid() = coach_user_id);
