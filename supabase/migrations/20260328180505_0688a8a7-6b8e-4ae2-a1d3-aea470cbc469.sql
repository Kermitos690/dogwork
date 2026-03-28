
-- Admin subscription overrides: allows admin to grant free subscriptions
CREATE TABLE public.admin_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tier text NOT NULL,
  granted_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, tier)
);

ALTER TABLE public.admin_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access select" ON public.admin_subscriptions FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admin full access insert" ON public.admin_subscriptions FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin full access update" ON public.admin_subscriptions FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin full access delete" ON public.admin_subscriptions FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Users can view own overrides" ON public.admin_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_admin_subscriptions_updated_at
  BEFORE UPDATE ON public.admin_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Support tickets for user feedback
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'bug',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own open tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'open');
CREATE POLICY "Admin full access select" ON public.support_tickets FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admin full access update" ON public.support_tickets FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin full access delete" ON public.support_tickets FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
