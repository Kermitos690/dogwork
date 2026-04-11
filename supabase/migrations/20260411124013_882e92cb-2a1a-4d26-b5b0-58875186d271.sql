
-- Table for admin-to-educator private notes on courses
CREATE TABLE public.course_admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL,
  educator_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'review_remark',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_admin_notes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on course_admin_notes"
ON public.course_admin_notes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Educators can read notes addressed to them
CREATE POLICY "Educators can read their course notes"
ON public.course_admin_notes
FOR SELECT
TO authenticated
USING (educator_user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_course_admin_notes_course ON public.course_admin_notes(course_id);
CREATE INDEX idx_course_admin_notes_educator ON public.course_admin_notes(educator_user_id);

-- Timestamp trigger
CREATE TRIGGER update_course_admin_notes_updated_at
BEFORE UPDATE ON public.course_admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
