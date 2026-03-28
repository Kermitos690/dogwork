-- Create coach profile for the admin user who also has educator role
INSERT INTO public.coach_profiles (user_id, display_name)
VALUES ('5ae79f02-178c-44c6-a0c2-52928bfa9240', 'Gaëtan - DogWork')
ON CONFLICT DO NOTHING;

-- Create coach_stripe_data entry so Connect onboarding can proceed
INSERT INTO public.coach_stripe_data (user_id)
VALUES ('5ae79f02-178c-44c6-a0c2-52928bfa9240')
ON CONFLICT DO NOTHING;