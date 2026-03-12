
-- Coach calendar events table
CREATE TABLE public.coach_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_user_id UUID NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'appointment',
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  client_user_id UUID DEFAULT NULL,
  dog_id UUID REFERENCES public.dogs(id) ON DELETE SET NULL DEFAULT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL DEFAULT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT DEFAULT '',
  is_available_slot BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.coach_calendar_events ENABLE ROW LEVEL SECURITY;

-- Coaches can CRUD their own events
CREATE POLICY "Coaches can view own events" ON public.coach_calendar_events
  FOR SELECT TO authenticated
  USING ((auth.uid() = coach_user_id) AND is_educator());

CREATE POLICY "Coaches can insert events" ON public.coach_calendar_events
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = coach_user_id) AND is_educator());

CREATE POLICY "Coaches can update events" ON public.coach_calendar_events
  FOR UPDATE TO authenticated
  USING ((auth.uid() = coach_user_id) AND is_educator());

CREATE POLICY "Coaches can delete events" ON public.coach_calendar_events
  FOR DELETE TO authenticated
  USING ((auth.uid() = coach_user_id) AND is_educator());

-- Clients can see events linked to them
CREATE POLICY "Clients can view their events" ON public.coach_calendar_events
  FOR SELECT TO authenticated
  USING (auth.uid() = client_user_id);
