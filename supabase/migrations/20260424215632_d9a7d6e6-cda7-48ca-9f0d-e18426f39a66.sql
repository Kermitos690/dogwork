ALTER TABLE public.shelter_spaces 
ADD COLUMN IF NOT EXISTS position_x INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_y INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_shelter_space_position(
  _space_id UUID,
  _x INTEGER,
  _y INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shelter_spaces
  SET position_x = _x, position_y = _y, updated_at = now()
  WHERE id = _space_id
    AND shelter_user_id = auth.uid();
END;
$$;