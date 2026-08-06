-- Operationele cleanup voor datahygiëne.
-- Veilig om periodiek handmatig te draaien in Supabase SQL editor.

-- 1) Preview: hoeveel audit-events zijn ouder dan 12 maanden?
-- Dit bestand is bewust read-only: geen DELETE/UPDATE statements.
DROP TABLE IF EXISTS _maintenance_old_audit_events;
CREATE TEMP TABLE _maintenance_old_audit_events (
  old_audit_event_count bigint
);

DO $$
BEGIN
  IF to_regclass('public.workshop_audit_events') IS NOT NULL THEN
    INSERT INTO _maintenance_old_audit_events (old_audit_event_count)
    SELECT count(*)
    FROM public.workshop_audit_events
    WHERE COALESCE("createdAt", created_at, now()) < now() - interval '12 months';
  ELSE
    RAISE NOTICE 'Tabel public.workshop_audit_events bestaat niet, stap 1 overgeslagen.';
  END IF;
END
$$;

SELECT old_audit_event_count
FROM _maintenance_old_audit_events;

-- 2) Samenvatting recente printfouten (laatste 30 dagen).
DROP TABLE IF EXISTS _maintenance_print_failures;
CREATE TEMP TABLE _maintenance_print_failures (
  week timestamptz,
  print_failed bigint,
  test_print_failed bigint
);

DO $$
BEGIN
  IF to_regclass('public.workshop_audit_events') IS NOT NULL THEN
    INSERT INTO _maintenance_print_failures (week, print_failed, test_print_failed)
    SELECT
      date_trunc('week', COALESCE("createdAt", created_at, now())) AS week,
      count(*) FILTER (WHERE action = 'LABEL_PRINT_FAILED') AS print_failed,
      count(*) FILTER (WHERE action = 'LABEL_TEST_PRINT_FAILED') AS test_print_failed
    FROM public.workshop_audit_events
    WHERE COALESCE("createdAt", created_at, now()) >= now() - interval '30 days'
    GROUP BY 1;
  ELSE
    RAISE NOTICE 'Tabel public.workshop_audit_events bestaat niet, stap 2 overgeslagen.';
  END IF;
END
$$;

SELECT week, print_failed, test_print_failed
FROM _maintenance_print_failures
ORDER BY week DESC;

-- 3) Detecteer mogelijke datagaten in open reparaties (alleen als tabel bestaat).
DROP TABLE IF EXISTS _maintenance_repair_gaps;
CREATE TEMP TABLE _maintenance_repair_gaps (
  id text,
  customer text,
  "customerId" text,
  machine text,
  "machineId" text,
  status text
);

DO $$
BEGIN
  IF to_regclass('public.repairs') IS NOT NULL THEN
    INSERT INTO _maintenance_repair_gaps (id, customer, "customerId", machine, "machineId", status)
    SELECT id::text, customer, "customerId"::text, machine, "machineId"::text, status
    FROM public.repairs
    WHERE status IN ('NEW', 'IN_WORKSHOP', 'WAITING_FOR_PARTS', 'WAITING_FOR_CUSTOMER', 'READY')
      AND (
        "customerId" IS NULL
        OR COALESCE(machine, '') = ''
      )
    ORDER BY COALESCE("updatedAt", updated_at, now()) DESC
    LIMIT 100;
  ELSE
    RAISE NOTICE 'Tabel public.repairs bestaat niet, stap 3 overgeslagen.';
  END IF;
END
$$;

SELECT id, customer, "customerId", machine, "machineId", status
FROM _maintenance_repair_gaps;
