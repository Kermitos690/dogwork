-- ============================================================
-- 1) Suppression de la table de tests QA temporaire (vide, non référencée)
-- ============================================================
DROP TABLE IF EXISTS public._p0_test_results;

-- ============================================================
-- 2) Ajout de search_path explicite sur les 4 fonctions email queue
-- ============================================================
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;