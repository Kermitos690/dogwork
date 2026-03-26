-- Add dog_id to course_bookings so users must specify which dog they're enrolling
ALTER TABLE public.course_bookings ADD COLUMN dog_id uuid REFERENCES public.dogs(id) ON DELETE SET NULL;

-- Add educator_decision fields
ALTER TABLE public.course_bookings ADD COLUMN educator_note text DEFAULT '';
ALTER TABLE public.course_bookings ADD COLUMN reviewed_at timestamptz DEFAULT NULL;