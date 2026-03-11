
-- Fix duplicate restrictive SELECT policies that conflict with coach access
DROP POLICY IF EXISTS "Users can view their own behavior logs" ON public.behavior_logs;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.day_progress;
DROP POLICY IF EXISTS "Users can view their own evaluations" ON public.dog_evaluations;
DROP POLICY IF EXISTS "Users can view their own objectives" ON public.dog_objectives;
DROP POLICY IF EXISTS "Users can view their own problems" ON public.dog_problems;
DROP POLICY IF EXISTS "Users can view their own dogs" ON public.dogs;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can view their own journal" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can view their own plans" ON public.training_plans;
