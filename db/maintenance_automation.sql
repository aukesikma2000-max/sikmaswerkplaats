-- Eenmalige setup voor automatische datahygiëne via pg_cron.
-- Draai dit bestand 1x in Supabase SQL editor.

-- 1) Zorg dat pg_cron beschikbaar is.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Cleanup-functie (muterend) die wekelijks kan draaien.
CREATE OR REPLACE FUNCTION public.run_workshop_maintenance(retention_months integer DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_audit_events bigint := 0;
  audit_table_exists boolean := false;
BEGIN
  audit_table_exists := to_regclass('public.workshop_audit_events') IS NOT NULL;

  IF audit_table_exists THEN
    DELETE FROM public.workshop_audit_events
    WHERE COALESCE("createdAt", created_at, now()) < now() - make_interval(months => retention_months);

    GET DIAGNOSTICS deleted_audit_events = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ranAt', now(),
    'retentionMonths', retention_months,
    'auditTableExists', audit_table_exists,
    'deletedAuditEvents', deleted_audit_events
  );
END;
$$;

-- 3) Plan wekelijkse uitvoering op zondag 03:17.
DO $$
DECLARE
  existing_job record;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron metadata niet beschikbaar. Controleer extensie/rechten.';
    RETURN;
  END IF;

  FOR existing_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'workshop_maintenance_weekly'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'workshop_maintenance_weekly',
    '17 3 * * 0',
    $job$SELECT public.run_workshop_maintenance(12);$job$
  );
END
$$;

-- 4) Verificatie van de actieve job.
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'workshop_maintenance_weekly';
