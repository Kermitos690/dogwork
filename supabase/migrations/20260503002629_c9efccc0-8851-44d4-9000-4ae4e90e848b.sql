CREATE TABLE IF NOT EXISTS public.dog_walks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  training_plan_id uuid NULL,
  day_progress_id uuid NULL,
  exercise_session_id uuid NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  duration_seconds integer NULL,
  distance_meters numeric NULL,
  elevation_gain_meters numeric NULL,
  elevation_loss_meters numeric NULL,
  average_speed_mps numeric NULL,
  weather_provider text NULL,
  weather_temperature_c numeric NULL,
  weather_condition text NULL,
  weather_wind_kph numeric NULL,
  weather_humidity_percent numeric NULL,
  weather_precipitation_mm numeric NULL,
  location_label text NULL,
  start_lat numeric NULL,
  start_lng numeric NULL,
  end_lat numeric NULL,
  end_lng numeric NULL,
  pee_done boolean NOT NULL DEFAULT false,
  poop_done boolean NOT NULL DEFAULT false,
  play_level text NOT NULL DEFAULT 'none' CHECK (play_level IN ('none','little','enough')),
  energy_before text NULL CHECK (energy_before IN ('low','normal','high')),
  energy_after text NULL CHECK (energy_after IN ('low','normal','high')),
  zone_before text NULL CHECK (zone_before IN ('green','orange','red')),
  zone_after text NULL CHECK (zone_after IN ('green','orange','red')),
  notes text NULL,
  incidents text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dog_walks_user_id ON public.dog_walks(user_id);
CREATE INDEX IF NOT EXISTS idx_dog_walks_dog_id ON public.dog_walks(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_walks_started_at ON public.dog_walks(started_at DESC);

ALTER TABLE public.dog_walks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own walks" ON public.dog_walks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all walks" ON public.dog_walks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_dog_walks_updated_at
  BEFORE UPDATE ON public.dog_walks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.dog_walk_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id uuid NOT NULL REFERENCES public.dog_walks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  accuracy_meters numeric NULL,
  altitude_meters numeric NULL,
  speed_mps numeric NULL,
  heading numeric NULL,
  sequence_index integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dog_walk_points_walk_id ON public.dog_walk_points(walk_id, sequence_index);

ALTER TABLE public.dog_walk_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own walk points" ON public.dog_walk_points
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all walk points" ON public.dog_walk_points
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));