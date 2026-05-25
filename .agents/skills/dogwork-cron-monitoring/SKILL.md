---
name: dogwork-cron-monitoring
description: Architecture cron jobs DogWork (pg_cron) + monitoring/alertes échecs. À déclencher pour tout sujet cron, scheduled job, monthly grant, daily check, alerte échec.
---

# DogWork — Cron Jobs & Monitoring

## Orchestration
**pg_cron** (extension Postgres). Tous les jobs sont définis via `cron.schedule(...)`.

## Jobs principaux
- `monthly-ai-credit-grant` — grant mensuel crédits IA (1er du mois)
- `monthly-credit-grant-daily` — check rattrapage quotidien
- `appointment-reminders` — rappels RDV coachs
- `cron_alert_failures` — alerte échecs (créé en phase 5b)

## Pattern wrapper edge function
```sql
create or replace procedure public.cron_invoke_edge(_path text, _body jsonb)
language plpgsql security definer as $$
declare _resp jsonb; _req_id bigint;
begin
  select net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/' || _path,
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.cron_secret')),
    body := _body
  ) into _req_id;
  insert into cron_job_runs(job_name, request_id, started_at) values (_path, _req_id, now());
end $$;
```

## Table `cron_job_runs`
```sql
create table cron_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  request_id bigint,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text, -- 'success' | 'failed' | 'running'
  error text,
  http_status int
);
create index on cron_job_runs(job_name, started_at desc);
```

## Procédures de monitoring
- `cron_check_recent_runs(_job_name text, _max_age interval)` — retourne true si run récent OK
- `cron_alert_failures()` — scanne `cron_job_runs` sur 24h, si échec ou silence → insert dans `notifications` (admin) + log

## Alertes
1. **Log DB** dans `cron_job_runs` (error, http_status)
2. **Notification admin** in-app via `notifications` table
3. **Email admin** optionnel via `notify-admin-cron-failure` edge function (Resend)

## Vérification post-déploiement
```sql
-- A. Jobs schedulés
select jobname, schedule, active from cron.job order by jobname;
-- B. Runs récents
select job_name, status, started_at, error
from cron_job_runs order by started_at desc limit 20;
-- C. Procédures wrapper
select proname from pg_proc where proname like 'cron\_%';
```

## Secret `CRON_SECRET`
Stocké via `current_setting('app.cron_secret')` au niveau DB. Set par admin avant 1er cron run.

## Smoke test
Forcer un run: `CALL cron_invoke_edge('monthly-ai-credit-grant', '{"dryRun":true}'::jsonb);`
Attendre ~15min puis vérifier `cron_job_runs` non vide.
