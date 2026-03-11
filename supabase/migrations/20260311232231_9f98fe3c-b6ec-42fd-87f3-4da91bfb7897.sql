
-- Fix: Educators must create links with 'pending' status (not 'active')
-- Only the client can accept (update to 'active')

-- 1. Update INSERT policy: force status = 'pending' on creation
DROP POLICY IF EXISTS "Coaches can insert links" ON public.client_links;
CREATE POLICY "Coaches can insert links" ON public.client_links 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = coach_user_id AND is_educator() AND status = 'pending');

-- 2. Update UPDATE policy: coaches can only cancel (set to 'cancelled'), clients can accept
DROP POLICY IF EXISTS "Coaches can update links" ON public.client_links;
CREATE POLICY "Coaches can update links" ON public.client_links 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = coach_user_id AND is_educator());

-- 3. Add policy allowing clients to accept/reject their own pending links
CREATE POLICY "Clients can respond to link requests" ON public.client_links
  FOR UPDATE TO authenticated
  USING (auth.uid() = client_user_id AND status = 'pending');
