
-- Create exercise_categories table
CREATE TABLE public.exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '🏗️',
  color text DEFAULT 'neon-blue',
  sort_order integer DEFAULT 0,
  is_professional boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.exercise_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert categories" ON public.exercise_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.exercise_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.exercise_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create exercises table
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.exercise_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_title text DEFAULT '',
  description text DEFAULT '',
  objective text DEFAULT '',
  dedication text DEFAULT '',
  summary text DEFAULT '',
  short_instruction text DEFAULT '',
  level text DEFAULT 'débutant',
  exercise_type text DEFAULT 'fondation',
  difficulty integer DEFAULT 1,
  duration text DEFAULT '5 min',
  repetitions text DEFAULT '3-5 fois',
  frequency text DEFAULT '1x/jour',
  environment text DEFAULT 'tous',
  intensity_level integer DEFAULT 1,
  cognitive_load integer DEFAULT 1,
  physical_load integer DEFAULT 1,
  steps jsonb DEFAULT '[]',
  tutorial_steps jsonb DEFAULT '[]',
  mistakes jsonb DEFAULT '[]',
  success_criteria text DEFAULT '',
  stop_criteria text DEFAULT '',
  vigilance text DEFAULT '',
  precautions jsonb DEFAULT '[]',
  contraindications jsonb DEFAULT '[]',
  health_precautions jsonb DEFAULT '[]',
  adaptations jsonb DEFAULT '[]',
  progression_next text DEFAULT '',
  regression_simplified text DEFAULT '',
  age_recommendation text DEFAULT 'tous',
  suitable_profiles jsonb DEFAULT '[]',
  compatible_reactivity boolean DEFAULT false,
  compatible_senior boolean DEFAULT false,
  compatible_puppy boolean DEFAULT false,
  compatible_muzzle boolean DEFAULT false,
  is_professional boolean DEFAULT false,
  target_breeds text[] DEFAULT NULL,
  equipment text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  priority_axis text[] DEFAULT '{}',
  target_problems text[] DEFAULT '{}',
  secondary_benefits text[] DEFAULT '{}',
  prerequisites text[] DEFAULT '{}',
  cover_image text DEFAULT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exercises" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update exercises" ON public.exercises FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete exercises" ON public.exercises FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_user_id uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  address text DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.30,
  max_participants integer DEFAULT 10,
  duration_minutes integer DEFAULT 60,
  category text DEFAULT 'general',
  dog_level text DEFAULT 'tous',
  is_active boolean DEFAULT true,
  next_session_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active courses" ON public.courses FOR SELECT TO authenticated USING (is_active = true OR auth.uid() = educator_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Educators can insert own courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = educator_user_id AND public.has_role(auth.uid(), 'educator'));
CREATE POLICY "Educators can update own courses" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = educator_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create course_bookings table
CREATE TABLE public.course_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'unpaid',
  amount_cents integer DEFAULT 0,
  commission_cents integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.course_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookings" ON public.course_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookings" ON public.course_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Educators can view bookings for own courses" ON public.course_bookings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_bookings.course_id AND courses.educator_user_id = auth.uid()));
CREATE POLICY "Admins can view all bookings" ON public.course_bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bookings" ON public.course_bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_exercises_category ON public.exercises(category_id);
CREATE INDEX idx_exercises_level ON public.exercises(level);
CREATE INDEX idx_exercises_professional ON public.exercises(is_professional);
CREATE INDEX idx_courses_educator ON public.courses(educator_user_id);
CREATE INDEX idx_course_bookings_course ON public.course_bookings(course_id);
