
-- Add human_reaction_level to behavior_logs
ALTER TABLE public.behavior_logs ADD COLUMN IF NOT EXISTS human_reaction_level integer;

-- Training plans table to persist generated plans
CREATE TABLE public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  plan_type text NOT NULL DEFAULT 'personalized',
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  axes jsonb NOT NULL DEFAULT '[]'::jsonb,
  precautions jsonb NOT NULL DEFAULT '[]'::jsonb,
  frequency text NOT NULL DEFAULT '',
  average_duration text NOT NULL DEFAULT '',
  total_days integer NOT NULL DEFAULT 28,
  security_level text NOT NULL DEFAULT 'standard',
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans" ON public.training_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plans" ON public.training_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.training_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON public.training_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Journal entries table
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  day_id integer,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean NOT NULL DEFAULT false,
  success_level text,
  incidents text,
  triggers_encountered text,
  dog_reaction text,
  recovery_time text,
  tension_level integer,
  focus_quality text,
  stop_quality text,
  no_quality text,
  leash_quality text,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal" ON public.journal_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own journal" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own journal" ON public.journal_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own journal" ON public.journal_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger for updated_at on training_plans
CREATE TRIGGER update_training_plans_updated_at BEFORE UPDATE ON public.training_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on journal_entries
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
