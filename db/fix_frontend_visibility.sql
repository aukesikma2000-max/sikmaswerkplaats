-- Ensure seeded data is visible in the frontend (anon/authenticated via Data API)
-- Run in Supabase SQL Editor (SQL role with privileges, e.g. postgres/service role)

-- 1) Ensure API roles can access schema and tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2) Grant SELECT, enable RLS and add read policies for frontend access
DO $$
DECLARE
  t text;
  read_policy_name text;
  insert_policy_name text;
  update_policy_name text;
  row_count bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers',
    'machines',
    'repairs',
    'repair_status_history',
    'repair_notes'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'Skipping missing table: public.%', t;
      CONTINUE;
    END IF;

    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.%I TO anon, authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    read_policy_name := 'public_read_' || t;
    insert_policy_name := 'public_insert_' || t;
    update_policy_name := 'public_update_' || t;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND policyname = read_policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        read_policy_name,
        t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND policyname = insert_policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)',
        insert_policy_name,
        t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND policyname = update_policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)',
        update_policy_name,
        t
      );
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO row_count;
    RAISE NOTICE 'public.%: % rows', t, row_count;
  END LOOP;
END $$;
