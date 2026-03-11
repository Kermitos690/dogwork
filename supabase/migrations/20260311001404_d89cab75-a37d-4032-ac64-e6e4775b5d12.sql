
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'educator');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Dogs table
CREATE TABLE public.dogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  breed TEXT,
  is_mixed BOOLEAN DEFAULT false,
  sex TEXT CHECK (sex IN ('male', 'femelle')),
  is_neutered BOOLEAN DEFAULT false,
  birth_date DATE,
  weight_kg NUMERIC,
  size TEXT CHECK (size IN ('petit', 'moyen', 'grand', 'très grand')),
  activity_level TEXT CHECK (activity_level IN ('faible', 'moyen', 'élevé', 'très élevé')),
  origin TEXT CHECK (origin IN ('refuge', 'élevage', 'particulier', 'autre')),
  adoption_date DATE,
  environment TEXT CHECK (environment IN ('appartement', 'maison', 'jardin', 'campagne', 'ville')),
  has_children BOOLEAN DEFAULT false,
  has_other_animals BOOLEAN DEFAULT false,
  alone_hours_per_day NUMERIC,
  -- Health
  known_diseases TEXT,
  joint_pain BOOLEAN DEFAULT false,
  heart_problems BOOLEAN DEFAULT false,
  epilepsy BOOLEAN DEFAULT false,
  allergies TEXT,
  overweight BOOLEAN DEFAULT false,
  current_treatments TEXT,
  vet_restrictions TEXT,
  physical_limitations TEXT,
  muzzle_required BOOLEAN DEFAULT false,
  bite_history BOOLEAN DEFAULT false,
  health_notes TEXT,
  -- Behavior
  obedience_level INTEGER CHECK (obedience_level BETWEEN 1 AND 5),
  sociability_dogs INTEGER CHECK (sociability_dogs BETWEEN 1 AND 5),
  sociability_humans INTEGER CHECK (sociability_humans BETWEEN 1 AND 5),
  excitement_level INTEGER CHECK (excitement_level BETWEEN 1 AND 5),
  frustration_level INTEGER CHECK (frustration_level BETWEEN 1 AND 5),
  recovery_capacity INTEGER CHECK (recovery_capacity BETWEEN 1 AND 5),
  noise_sensitivity INTEGER CHECK (noise_sensitivity BETWEEN 1 AND 5),
  separation_sensitivity INTEGER CHECK (separation_sensitivity BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dogs" ON public.dogs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own dogs" ON public.dogs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own dogs" ON public.dogs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own dogs" ON public.dogs FOR DELETE USING (auth.uid() = user_id);

-- Dog evaluations (initial assessment)
CREATE TABLE public.dog_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responds_to_name TEXT CHECK (responds_to_name IN ('oui', 'parfois', 'non')),
  holds_sit TEXT CHECK (holds_sit IN ('oui', 'parfois', 'non')),
  holds_down TEXT CHECK (holds_down IN ('oui', 'parfois', 'non')),
  walks_without_pulling TEXT CHECK (walks_without_pulling IN ('oui', 'parfois', 'non')),
  stays_calm_on_mat TEXT CHECK (stays_calm_on_mat IN ('oui', 'parfois', 'non')),
  reacts_to_dogs TEXT CHECK (reacts_to_dogs IN ('oui', 'parfois', 'non')),
  reacts_to_humans TEXT CHECK (reacts_to_humans IN ('oui', 'parfois', 'non')),
  barks_frequently TEXT CHECK (barks_frequently IN ('oui', 'parfois', 'non')),
  jumps_on_people TEXT CHECK (jumps_on_people IN ('oui', 'parfois', 'non')),
  tolerates_frustration TEXT CHECK (tolerates_frustration IN ('oui', 'parfois', 'non')),
  tolerates_solitude TEXT CHECK (tolerates_solitude IN ('oui', 'parfois', 'non')),
  has_bitten TEXT CHECK (has_bitten IN ('oui', 'non')),
  main_trigger TEXT,
  problem_intensity INTEGER CHECK (problem_intensity BETWEEN 1 AND 5),
  problem_frequency TEXT CHECK (problem_frequency IN ('rarement', 'parfois', 'souvent', 'toujours')),
  comfort_distance_meters NUMERIC,
  recovery_time TEXT CHECK (recovery_time IN ('rapide', 'moyenne', 'lente', 'très lente')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dog_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own evaluations" ON public.dog_evaluations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own evaluations" ON public.dog_evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own evaluations" ON public.dog_evaluations FOR UPDATE USING (auth.uid() = user_id);

-- Dog problems
CREATE TABLE public.dog_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_key TEXT NOT NULL,
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 5),
  frequency TEXT CHECK (frequency IN ('rarement', 'parfois', 'souvent', 'toujours')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dog_id, problem_key)
);

ALTER TABLE public.dog_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own problems" ON public.dog_problems FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own problems" ON public.dog_problems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own problems" ON public.dog_problems FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own problems" ON public.dog_problems FOR DELETE USING (auth.uid() = user_id);

-- Dog objectives
CREATE TABLE public.dog_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objective_key TEXT NOT NULL,
  is_priority BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dog_id, objective_key)
);

ALTER TABLE public.dog_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own objectives" ON public.dog_objectives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own objectives" ON public.dog_objectives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own objectives" ON public.dog_objectives FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own objectives" ON public.dog_objectives FOR DELETE USING (auth.uid() = user_id);

-- Day progress (per dog)
CREATE TABLE public.day_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  completed_exercises TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  validated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dog_id, day_id)
);

ALTER TABLE public.day_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress" ON public.day_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.day_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.day_progress FOR UPDATE USING (auth.uid() = user_id);

-- Behavior logs (per dog)
CREATE TABLE public.behavior_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id INTEGER NOT NULL,
  jump_on_human BOOLEAN DEFAULT false,
  barking BOOLEAN DEFAULT false,
  stop_response TEXT CHECK (stop_response IN ('oui', 'moyen', 'non')),
  no_response TEXT CHECK (no_response IN ('oui', 'moyen', 'non')),
  focus_quality TEXT CHECK (focus_quality IN ('bon', 'moyen', 'faible')),
  leash_walk_quality TEXT CHECK (leash_walk_quality IN ('bonne', 'moyenne', 'difficile')),
  tension_level INTEGER CHECK (tension_level BETWEEN 1 AND 5),
  dog_reaction_level INTEGER CHECK (dog_reaction_level BETWEEN 1 AND 5),
  comfort_distance_meters NUMERIC DEFAULT 20,
  recovery_after_trigger TEXT CHECK (recovery_after_trigger IN ('rapide', 'moyenne', 'lente')),
  comments TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dog_id, day_id)
);

ALTER TABLE public.behavior_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own behavior logs" ON public.behavior_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own behavior logs" ON public.behavior_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own behavior logs" ON public.behavior_logs FOR UPDATE USING (auth.uid() = user_id);

-- Exercise sessions (per dog)
CREATE TABLE public.exercise_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_actual INTEGER DEFAULT 0,
  repetitions_done INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.exercise_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions" ON public.exercise_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.exercise_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dogs_updated_at BEFORE UPDATE ON public.dogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_day_progress_updated_at BEFORE UPDATE ON public.day_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
