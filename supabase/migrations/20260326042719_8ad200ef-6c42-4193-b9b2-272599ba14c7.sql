-- Add template fields to training_plans
ALTER TABLE public.training_plans 
  ADD COLUMN is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN template_tier text DEFAULT NULL,
  ADD COLUMN template_category text DEFAULT NULL,
  ADD COLUMN template_description text DEFAULT '';

-- Make user_id nullable for templates (system-generated plans have no owner)
ALTER TABLE public.training_plans ALTER COLUMN user_id DROP NOT NULL;

-- Make dog_id nullable for templates (not tied to a specific dog)
ALTER TABLE public.training_plans ALTER COLUMN dog_id DROP NOT NULL;

-- Index for fast template lookups
CREATE INDEX idx_training_plans_template ON public.training_plans (is_template, template_tier) WHERE is_template = true;

-- RLS: everyone can read templates
CREATE POLICY "Anyone can view plan templates"
ON public.training_plans
FOR SELECT
TO authenticated
USING (is_template = true);
