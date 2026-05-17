-- Bucket privé pour stocker les guides PDF d'onboarding générés à la création de compte.
-- Accès via signed URL uniquement; aucun accès public ni lecture par les utilisateurs.
insert into storage.buckets (id, name, public)
values ('onboarding-pdfs', 'onboarding-pdfs', false)
on conflict (id) do nothing;

-- Seul le rôle service_role (edge functions / actions admin) peut écrire/lire.
-- Pas de policy ouverte : par défaut Storage refuse aux rôles authenticated/anon.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'onboarding_pdfs_service_role_all'
  ) then
    create policy "onboarding_pdfs_service_role_all"
      on storage.objects for all
      to service_role
      using (bucket_id = 'onboarding-pdfs')
      with check (bucket_id = 'onboarding-pdfs');
  end if;
end $$;

-- Permettre aux admins authentifiés de gérer (upload + signed URL via Supabase JS).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'onboarding_pdfs_admin_write'
  ) then
    create policy "onboarding_pdfs_admin_write"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'onboarding-pdfs'
        and public.has_role(auth.uid(), 'admin'::public.app_role)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'onboarding_pdfs_admin_read'
  ) then
    create policy "onboarding_pdfs_admin_read"
      on storage.objects for select
      to authenticated
      using (
        bucket_id = 'onboarding-pdfs'
        and public.has_role(auth.uid(), 'admin'::public.app_role)
      );
  end if;
end $$;