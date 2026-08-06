-- Normalize repairs schema so frontend insert/update uses a consistent column set.
-- Safe to run multiple times in Supabase SQL Editor.

DO $$
BEGIN
  IF to_regclass('public.repairs') IS NULL THEN
    RAISE EXCEPTION 'Table public.repairs does not exist.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workshop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "settingKey" text NOT NULL UNIQUE,
  "settingValue" jsonb NOT NULL,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_settings
  ADD COLUMN IF NOT EXISTS setting_key text,
  ADD COLUMN IF NOT EXISTS setting_value jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.workshop_settings
SET setting_key = COALESCE(setting_key, "settingKey"),
    setting_value = COALESCE(setting_value, "settingValue"),
    updated_at = COALESCE(updated_at, "updatedAt");

UPDATE public.workshop_settings
SET "settingKey" = COALESCE("settingKey", setting_key),
    "settingValue" = COALESCE("settingValue", setting_value, '{}'::jsonb),
    "updatedAt" = COALESCE("updatedAt", updated_at, now());

INSERT INTO public.workshop_settings ("settingKey", "settingValue", "updatedAt")
VALUES ('label_printer', '{"printerName":"123inkt LW650","enabled":true,"host":"192.168.1.150","port":9100,"mockMode":true}'::jsonb, now())
ON CONFLICT ("settingKey") DO NOTHING;

CREATE TABLE IF NOT EXISTS public.workshop_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  "actorName" text,
  "actorRole" text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_audit_events
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.workshop_audit_events
SET actor_name = COALESCE(actor_name, "actorName"),
    actor_role = COALESCE(actor_role, "actorRole"),
    created_at = COALESCE(created_at, "createdAt");

UPDATE public.workshop_audit_events
SET "actorName" = COALESCE("actorName", actor_name),
    "actorRole" = COALESCE("actorRole", actor_role),
    "createdAt" = COALESCE("createdAt", created_at, now());

CREATE INDEX IF NOT EXISTS workshop_audit_events_action_idx ON public.workshop_audit_events(action, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS workshop_audit_events_actor_idx ON public.workshop_audit_events("actorName", "createdAt" DESC);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS "firstName" text,
  ADD COLUMN IF NOT EXISTS "lastName" text,
  ADD COLUMN IF NOT EXISTS "postalCode" text,
  ADD COLUMN IF NOT EXISTS "mobilePhone" text,
  ADD COLUMN IF NOT EXISTS "landlinePhone" text,
  ADD COLUMN IF NOT EXISTS "maintenanceReminderOptIn" boolean,
  ADD COLUMN IF NOT EXISTS "nextMaintenanceReminderDate" date,
  ADD COLUMN IF NOT EXISTS "maintenanceConsentDate" timestamptz,
  ADD COLUMN IF NOT EXISTS "maintenanceConsentMethod" text,
  ADD COLUMN IF NOT EXISTS "maintenanceConsentEmployee" text,
  ADD COLUMN IF NOT EXISTS "maintenanceReminderStatus" text,
  ADD COLUMN IF NOT EXISTS "maintenanceLastModified" timestamptz,
  ADD COLUMN IF NOT EXISTS "maintenanceUnsubscribedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "maintenanceUnsubscribeReason" text,
  ADD COLUMN IF NOT EXISTS maintenance_reminder_opt_in boolean,
  ADD COLUMN IF NOT EXISTS next_maintenance_reminder_date date,
  ADD COLUMN IF NOT EXISTS maintenance_consent_date timestamptz,
  ADD COLUMN IF NOT EXISTS maintenance_consent_method text,
  ADD COLUMN IF NOT EXISTS maintenance_consent_employee text,
  ADD COLUMN IF NOT EXISTS maintenance_reminder_status text,
  ADD COLUMN IF NOT EXISTS maintenance_last_modified timestamptz,
  ADD COLUMN IF NOT EXISTS maintenance_unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS maintenance_unsubscribe_reason text;

DO $$
DECLARE
  v_name_col text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'first_name'
  ) THEN
    UPDATE public.customers
    SET "firstName" = COALESCE("firstName", first_name)
    WHERE "firstName" IS NULL
      AND first_name IS NOT NULL
      AND first_name <> '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'last_name'
  ) THEN
    UPDATE public.customers
    SET "lastName" = COALESCE("lastName", last_name)
    WHERE "lastName" IS NULL
      AND last_name IS NOT NULL
      AND last_name <> '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'postal_code'
  ) THEN
    UPDATE public.customers
    SET "postalCode" = COALESCE("postalCode", postal_code)
    WHERE "postalCode" IS NULL
      AND postal_code IS NOT NULL
      AND postal_code <> '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'mobile_phone'
  ) THEN
    UPDATE public.customers
    SET "mobilePhone" = COALESCE("mobilePhone", mobile_phone)
    WHERE "mobilePhone" IS NULL
      AND mobile_phone IS NOT NULL
      AND mobile_phone <> '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'landline_phone'
  ) THEN
    UPDATE public.customers
    SET "landlinePhone" = COALESCE("landlinePhone", landline_phone)
    WHERE "landlinePhone" IS NULL
      AND landline_phone IS NOT NULL
      AND landline_phone <> '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'maintenance_reminder_opt_in'
  ) THEN
    UPDATE public.customers
    SET "maintenanceReminderOptIn" = COALESCE("maintenanceReminderOptIn", maintenance_reminder_opt_in)
    WHERE "maintenanceReminderOptIn" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'next_maintenance_reminder_date'
  ) THEN
    UPDATE public.customers
    SET "nextMaintenanceReminderDate" = COALESCE("nextMaintenanceReminderDate", next_maintenance_reminder_date)
    WHERE "nextMaintenanceReminderDate" IS NULL;
  END IF;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'name') THEN 'name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'full_name') THEN 'full_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'customer_name') THEN 'customer_name'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'naam') THEN 'naam'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'klantnaam') THEN 'klantnaam'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'customer') THEN 'customer'
    ELSE NULL
  END INTO v_name_col;

  IF v_name_col IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.customers
       SET
         "firstName" = COALESCE("firstName", split_part(trim(%1$I), '' '', 1)),
         "lastName" = COALESCE(
           "lastName",
           NULLIF(trim(substr(trim(%1$I), length(split_part(trim(%1$I), '' '', 1)) + 1)), '''')
         )
       WHERE %1$I IS NOT NULL
         AND trim(%1$I) <> ''''
         AND ("firstName" IS NULL OR "lastName" IS NULL)',
      v_name_col
    );
  END IF;

  UPDATE public.customers
  SET phone = COALESCE(phone, "mobilePhone", "landlinePhone")
  WHERE phone IS NULL;

  UPDATE public.customers
  SET "mobilePhone" = COALESCE("mobilePhone", phone)
  WHERE "mobilePhone" IS NULL
    AND phone IS NOT NULL
    AND phone <> '';

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'name'
  ) THEN
    UPDATE public.customers
    SET name = concat_ws(' ', NULLIF("firstName", ''), NULLIF("lastName", ''))
    WHERE COALESCE(concat_ws(' ', NULLIF("firstName", ''), NULLIF("lastName", '')), '') <> '';
  END IF;

  UPDATE public.customers
  SET "maintenanceReminderOptIn" = COALESCE("maintenanceReminderOptIn", false)
  WHERE "maintenanceReminderOptIn" IS NULL;

  UPDATE public.customers
  SET maintenance_reminder_opt_in = COALESCE(maintenance_reminder_opt_in, "maintenanceReminderOptIn")
  WHERE maintenance_reminder_opt_in IS NULL
    AND "maintenanceReminderOptIn" IS NOT NULL;

  UPDATE public.customers
  SET next_maintenance_reminder_date = COALESCE(next_maintenance_reminder_date, "nextMaintenanceReminderDate")
  WHERE next_maintenance_reminder_date IS NULL
    AND "nextMaintenanceReminderDate" IS NOT NULL;

  UPDATE public.customers
  SET "maintenanceConsentDate" = COALESCE("maintenanceConsentDate", maintenance_consent_date)
  WHERE "maintenanceConsentDate" IS NULL
    AND maintenance_consent_date IS NOT NULL;

  UPDATE public.customers
  SET "maintenanceConsentMethod" = COALESCE("maintenanceConsentMethod", maintenance_consent_method)
  WHERE "maintenanceConsentMethod" IS NULL
    AND maintenance_consent_method IS NOT NULL;

  UPDATE public.customers
  SET "maintenanceConsentEmployee" = COALESCE("maintenanceConsentEmployee", maintenance_consent_employee)
  WHERE "maintenanceConsentEmployee" IS NULL
    AND maintenance_consent_employee IS NOT NULL;

  UPDATE public.customers
  SET "maintenanceReminderStatus" = COALESCE("maintenanceReminderStatus", maintenance_reminder_status)
  WHERE "maintenanceReminderStatus" IS NULL
    AND maintenance_reminder_status IS NOT NULL;

  UPDATE public.customers
  SET "maintenanceLastModified" = COALESCE("maintenanceLastModified", maintenance_last_modified)
  WHERE "maintenanceLastModified" IS NULL
    AND maintenance_last_modified IS NOT NULL;

  UPDATE public.customers
  SET "maintenanceUnsubscribedAt" = COALESCE("maintenanceUnsubscribedAt", maintenance_unsubscribed_at)
  WHERE "maintenanceUnsubscribedAt" IS NULL
    AND maintenance_unsubscribed_at IS NOT NULL;

  UPDATE public.customers
  SET "maintenanceUnsubscribeReason" = COALESCE("maintenanceUnsubscribeReason", maintenance_unsubscribe_reason)
  WHERE "maintenanceUnsubscribeReason" IS NULL
    AND maintenance_unsubscribe_reason IS NOT NULL;

  UPDATE public.customers
  SET maintenance_consent_date = COALESCE(maintenance_consent_date, "maintenanceConsentDate")
  WHERE maintenance_consent_date IS NULL
    AND "maintenanceConsentDate" IS NOT NULL;

  UPDATE public.customers
  SET maintenance_consent_method = COALESCE(maintenance_consent_method, "maintenanceConsentMethod")
  WHERE maintenance_consent_method IS NULL
    AND "maintenanceConsentMethod" IS NOT NULL;

  UPDATE public.customers
  SET maintenance_consent_employee = COALESCE(maintenance_consent_employee, "maintenanceConsentEmployee")
  WHERE maintenance_consent_employee IS NULL
    AND "maintenanceConsentEmployee" IS NOT NULL;

  UPDATE public.customers
  SET maintenance_reminder_status = COALESCE(maintenance_reminder_status, "maintenanceReminderStatus")
  WHERE maintenance_reminder_status IS NULL
    AND "maintenanceReminderStatus" IS NOT NULL;

  UPDATE public.customers
  SET maintenance_last_modified = COALESCE(maintenance_last_modified, "maintenanceLastModified")
  WHERE maintenance_last_modified IS NULL
    AND "maintenanceLastModified" IS NOT NULL;

  UPDATE public.customers
  SET maintenance_unsubscribed_at = COALESCE(maintenance_unsubscribed_at, "maintenanceUnsubscribedAt")
  WHERE maintenance_unsubscribed_at IS NULL
    AND "maintenanceUnsubscribedAt" IS NOT NULL;

  UPDATE public.customers
  SET maintenance_unsubscribe_reason = COALESCE(maintenance_unsubscribe_reason, "maintenanceUnsubscribeReason")
  WHERE maintenance_unsubscribe_reason IS NULL
    AND "maintenanceUnsubscribeReason" IS NOT NULL;

  UPDATE public.customers
  SET "maintenanceReminderStatus" = COALESCE("maintenanceReminderStatus", 'INACTIVE')
  WHERE "maintenanceReminderStatus" IS NULL;

  UPDATE public.customers
  SET maintenance_reminder_status = COALESCE(maintenance_reminder_status, "maintenanceReminderStatus")
  WHERE maintenance_reminder_status IS NULL;
END $$;

ALTER TABLE public.customers
  ALTER COLUMN "maintenanceReminderOptIn" SET DEFAULT false;

ALTER TABLE public.customers
  ALTER COLUMN "maintenanceReminderStatus" SET DEFAULT 'INACTIVE';

CREATE TABLE IF NOT EXISTS public.maintenance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  "repairId" text REFERENCES public.repairs(id) ON DELETE SET NULL,
  "plannedFor" date NOT NULL,
  status text NOT NULL DEFAULT 'PLANNED',
  channel text NOT NULL DEFAULT 'UNKNOWN',
  source text NOT NULL DEFAULT 'WORKFLOW',
  "sentAt" timestamptz,
  "cancelledAt" timestamptz,
  notes text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_reminders
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS repair_id text,
  ADD COLUMN IF NOT EXISTS planned_for date,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.maintenance_reminders
SET customer_id = COALESCE(customer_id, "customerId"),
    repair_id = COALESCE(repair_id, "repairId"),
    planned_for = COALESCE(planned_for, "plannedFor"),
    sent_at = COALESCE(sent_at, "sentAt"),
    cancelled_at = COALESCE(cancelled_at, "cancelledAt"),
    created_at = COALESCE(created_at, "createdAt"),
    updated_at = COALESCE(updated_at, "updatedAt");

CREATE INDEX IF NOT EXISTS maintenance_reminders_customer_idx ON public.maintenance_reminders("customerId");
CREATE INDEX IF NOT EXISTS maintenance_reminders_planned_idx ON public.maintenance_reminders("plannedFor", status);

CREATE TABLE IF NOT EXISTS public.maintenance_service_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  "repairId" text REFERENCES public.repairs(id) ON DELETE SET NULL,
  "eventType" text NOT NULL,
  note text,
  "oldValue" jsonb,
  "newValue" jsonb,
  reason text,
  "actorName" text,
  "actorRole" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_service_audit
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS repair_id text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS old_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value jsonb,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.maintenance_service_audit
SET customer_id = COALESCE(customer_id, "customerId"),
    repair_id = COALESCE(repair_id, "repairId"),
    event_type = COALESCE(event_type, "eventType"),
    old_value = COALESCE(old_value, "oldValue"),
    new_value = COALESCE(new_value, "newValue"),
    actor_name = COALESCE(actor_name, "actorName"),
    actor_role = COALESCE(actor_role, "actorRole"),
    created_at = COALESCE(created_at, "createdAt");

CREATE INDEX IF NOT EXISTS maintenance_service_audit_customer_idx ON public.maintenance_service_audit("customerId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS public.communication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  "repairId" text REFERENCES public.repairs(id) ON DELETE CASCADE,
  "machineId" uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  channel text NOT NULL,
  type text,
  "occurredAt" timestamptz NOT NULL DEFAULT now(),
  "actorName" text,
  "actorId" text,
  subject text,
  "messageBody" text,
  status text,
  "isAutomatic" boolean NOT NULL DEFAULT false,
  "errorMessage" text,
  "attachmentUrl" text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_events
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS repair_id text,
  ADD COLUMN IF NOT EXISTS machine_id uuid,
  ADD COLUMN IF NOT EXISTS communication_channel text,
  ADD COLUMN IF NOT EXISTS communication_type text,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_id text,
  ADD COLUMN IF NOT EXISTS message_body text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS is_automatic boolean,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.communication_events
SET customer_id = COALESCE(customer_id, "customerId"),
    repair_id = COALESCE(repair_id, "repairId"),
    machine_id = COALESCE(machine_id, "machineId"),
    communication_channel = COALESCE(communication_channel, channel),
    communication_type = COALESCE(communication_type, type),
    occurred_at = COALESCE(occurred_at, "occurredAt"),
    actor_name = COALESCE(actor_name, "actorName"),
    actor_id = COALESCE(actor_id, "actorId"),
    message_body = COALESCE(message_body, "messageBody"),
    error_message = COALESCE(error_message, "errorMessage"),
    attachment_url = COALESCE(attachment_url, "attachmentUrl"),
    is_automatic = COALESCE(is_automatic, "isAutomatic", false),
    created_at = COALESCE(created_at, "createdAt"),
    updated_at = COALESCE(updated_at, "updatedAt");

UPDATE public.communication_events
SET "customerId" = COALESCE("customerId", customer_id),
    "repairId" = COALESCE("repairId", repair_id),
    "machineId" = COALESCE("machineId", machine_id),
    channel = COALESCE(channel, communication_channel),
    type = COALESCE(type, communication_type),
    "occurredAt" = COALESCE("occurredAt", occurred_at, now()),
    "actorName" = COALESCE("actorName", actor_name),
    "actorId" = COALESCE("actorId", actor_id),
    "messageBody" = COALESCE("messageBody", message_body),
    "errorMessage" = COALESCE("errorMessage", error_message),
    "attachmentUrl" = COALESCE("attachmentUrl", attachment_url),
    "isAutomatic" = COALESCE("isAutomatic", is_automatic, false),
    "createdAt" = COALESCE("createdAt", created_at, now()),
    "updatedAt" = COALESCE("updatedAt", updated_at, now());

CREATE INDEX IF NOT EXISTS communication_events_repair_idx ON public.communication_events("repairId", "occurredAt" DESC);
CREATE INDEX IF NOT EXISTS communication_events_customer_idx ON public.communication_events("customerId", "occurredAt" DESC);
CREATE INDEX IF NOT EXISTS communication_events_machine_idx ON public.communication_events("machineId", "occurredAt" DESC);
CREATE INDEX IF NOT EXISTS communication_events_channel_idx ON public.communication_events(channel, "occurredAt" DESC);

-- Add readable customer numbers while keeping UUID ids as primary keys.
DO $$
DECLARE
  max_existing bigint;
BEGIN
  IF to_regclass('public.customers') IS NULL THEN
    RAISE NOTICE 'Skipping customer number migration because public.customers does not exist.';
    RETURN;
  END IF;

  EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.customer_number_seq START 1';

  ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS "customerNumber" text;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'customer_number'
  ) THEN
    UPDATE public.customers
    SET "customerNumber" = COALESCE(NULLIF("customerNumber", ''), customer_number)
    WHERE ("customerNumber" IS NULL OR "customerNumber" = '')
      AND customer_number IS NOT NULL
      AND customer_number <> '';
  END IF;

  SELECT COALESCE(MAX((regexp_match("customerNumber", '^KL-([0-9]+)$'))[1]::bigint), 0)
  INTO max_existing
  FROM public.customers
  WHERE "customerNumber" ~ '^KL-[0-9]+$';

  PERFORM setval('public.customer_number_seq', GREATEST(max_existing, 1), max_existing > 0);

  UPDATE public.customers
  SET "customerNumber" = 'KL-' || lpad((nextval('public.customer_number_seq'))::text, 5, '0')
  WHERE "customerNumber" IS NULL OR "customerNumber" = '';

  ALTER TABLE public.customers
    ALTER COLUMN "customerNumber" SET DEFAULT ('KL-' || lpad(nextval('public.customer_number_seq')::text, 5, '0'));

  CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_number_idx ON public.customers("customerNumber");

  BEGIN
    ALTER TABLE public.customers
      ALTER COLUMN "customerNumber" SET NOT NULL;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Could not set NOT NULL on customers.customerNumber yet; check for rows without customerNumber.';
  END;
END $$;

-- Add readable repair numbers for legacy records while keeping id as primary key.
DO $$
DECLARE
  max_existing bigint;
BEGIN
  IF to_regclass('public.repairs') IS NULL THEN
    RAISE NOTICE 'Skipping repair number migration because public.repairs does not exist.';
    RETURN;
  END IF;

  EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.repair_number_seq START 1';

  ALTER TABLE public.repairs
    ADD COLUMN IF NOT EXISTS repair_number text;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'repairs'
      AND column_name = 'repairNumber'
  ) THEN
    UPDATE public.repairs
    SET repair_number = COALESCE(NULLIF(repair_number, ''), "repairNumber")
    WHERE (repair_number IS NULL OR repair_number = '')
      AND "repairNumber" IS NOT NULL
      AND "repairNumber" <> '';
  END IF;

  UPDATE public.repairs
  SET repair_number = id
  WHERE (repair_number IS NULL OR repair_number = '')
    AND id LIKE 'R-%';

  SELECT COALESCE(MAX((regexp_match(repair_number, '^R-[0-9]{4}-([0-9]+)$'))[1]::bigint), 0)
  INTO max_existing
  FROM public.repairs
  WHERE repair_number ~ '^R-[0-9]{4}-[0-9]+$';

  PERFORM setval('public.repair_number_seq', GREATEST(max_existing, 1), max_existing > 0);

  UPDATE public.repairs
  SET repair_number = 'R-2026-' || lpad((nextval('public.repair_number_seq'))::text, 5, '0')
  WHERE repair_number IS NULL OR repair_number = '';

  ALTER TABLE public.repairs
    ALTER COLUMN repair_number SET DEFAULT ('R-2026-' || lpad(nextval('public.repair_number_seq')::text, 5, '0'));

  CREATE UNIQUE INDEX IF NOT EXISTS repairs_repair_number_idx ON public.repairs(repair_number);
END $$;

ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS customer text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS machine text,
  ADD COLUMN IF NOT EXISTS issue text,
  ADD COLUMN IF NOT EXISTS repair text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS date text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS history jsonb,
  ADD COLUMN IF NOT EXISTS "customerId" uuid,
  ADD COLUMN IF NOT EXISTS "machineId" uuid,
  ADD COLUMN IF NOT EXISTS "partsUsed" text,
  ADD COLUMN IF NOT EXISTS "shelfLocation" text,
  ADD COLUMN IF NOT EXISTS "paymentStatus" text,
  ADD COLUMN IF NOT EXISTS "paymentMethod" text,
  ADD COLUMN IF NOT EXISTS "counterNote" text,
  ADD COLUMN IF NOT EXISTS "repairGroupId" text,
  ADD COLUMN IF NOT EXISTS "repairOutcome" text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS website_submission_date timestamptz,
  ADD COLUMN IF NOT EXISTS website_submission_id text,
  ADD COLUMN IF NOT EXISTS converted_to_repair boolean,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_by text,
  ADD COLUMN IF NOT EXISTS "statusUpdatedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "readyAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "nextMaintenanceDate" text,
  ADD COLUMN IF NOT EXISTS repair_group_id text,
  ADD COLUMN IF NOT EXISTS repair_outcome text,
  ADD COLUMN IF NOT EXISTS repair_source text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_maintenance_date text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS counter_note text,
  ADD COLUMN IF NOT EXISTS websiteSubmissionDate timestamptz,
  ADD COLUMN IF NOT EXISTS websiteSubmissionId text,
  ADD COLUMN IF NOT EXISTS convertedToRepair boolean,
  ADD COLUMN IF NOT EXISTS convertedAt timestamptz,
  ADD COLUMN IF NOT EXISTS convertedBy text,
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz;

-- Backfill from alternative legacy column names when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'customer_name'
  ) THEN
    UPDATE public.repairs SET customer = COALESCE(customer, customer_name) WHERE customer IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'name'
  ) THEN
    UPDATE public.repairs SET customer = COALESCE(customer, name) WHERE customer IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'phone_number'
  ) THEN
    UPDATE public.repairs SET phone = COALESCE(phone, phone_number) WHERE phone IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'email_address'
  ) THEN
    UPDATE public.repairs SET email = COALESCE(email, email_address) WHERE email IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'place'
  ) THEN
    UPDATE public.repairs SET city = COALESCE(city, place) WHERE city IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'machine_name'
  ) THEN
    UPDATE public.repairs SET machine = COALESCE(machine, machine_name) WHERE machine IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'complaint'
  ) THEN
    UPDATE public.repairs SET issue = COALESCE(issue, complaint) WHERE issue IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'repair_work'
  ) THEN
    UPDATE public.repairs SET repair = COALESCE(repair, repair_work) WHERE repair IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'created_on'
  ) THEN
    UPDATE public.repairs SET date = COALESCE(date, created_on) WHERE date IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'note'
  ) THEN
    UPDATE public.repairs SET notes = COALESCE(notes, note) WHERE notes IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'payment_status'
  ) THEN
    UPDATE public.repairs SET "paymentStatus" = COALESCE("paymentStatus", payment_status) WHERE "paymentStatus" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'payment_method'
  ) THEN
    UPDATE public.repairs SET "paymentMethod" = COALESCE("paymentMethod", payment_method) WHERE "paymentMethod" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'counter_note'
  ) THEN
    UPDATE public.repairs SET "counterNote" = COALESCE("counterNote", counter_note) WHERE "counterNote" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'customer_id'
  ) THEN
    UPDATE public.repairs SET "customerId" = COALESCE("customerId", customer_id) WHERE "customerId" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'machine_id'
  ) THEN
    UPDATE public.repairs SET "machineId" = COALESCE("machineId", machine_id) WHERE "machineId" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'parts_used'
  ) THEN
    UPDATE public.repairs SET "partsUsed" = COALESCE("partsUsed", parts_used) WHERE "partsUsed" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'shelf_location'
  ) THEN
    UPDATE public.repairs SET "shelfLocation" = COALESCE("shelfLocation", shelf_location) WHERE "shelfLocation" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'created_at'
  ) THEN
    UPDATE public.repairs SET "createdAt" = COALESCE("createdAt", created_at) WHERE "createdAt" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'updated_at'
  ) THEN
    UPDATE public.repairs SET "updatedAt" = COALESCE("updatedAt", updated_at) WHERE "updatedAt" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'status_updated_at'
  ) THEN
    UPDATE public.repairs SET "statusUpdatedAt" = COALESCE("statusUpdatedAt", status_updated_at) WHERE "statusUpdatedAt" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'ready_at'
  ) THEN
    UPDATE public.repairs SET "readyAt" = COALESCE("readyAt", ready_at) WHERE "readyAt" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'repair_group_id'
  ) THEN
    UPDATE public.repairs SET "repairGroupId" = COALESCE("repairGroupId", repair_group_id) WHERE "repairGroupId" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'repair_outcome'
  ) THEN
    UPDATE public.repairs SET "repairOutcome" = COALESCE("repairOutcome", repair_outcome) WHERE "repairOutcome" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'next_maintenance_date'
  ) THEN
    UPDATE public.repairs SET "nextMaintenanceDate" = COALESCE("nextMaintenanceDate", next_maintenance_date) WHERE "nextMaintenanceDate" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'source'
  ) THEN
    UPDATE public.repairs SET source = COALESCE(source, 'Balie') WHERE source IS NULL OR source = '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'website_submission_date'
  ) THEN
    UPDATE public.repairs SET website_submission_date = COALESCE(website_submission_date, "createdAt") WHERE website_submission_date IS NULL AND status = 'VOORAANMELDING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'converted_to_repair'
  ) THEN
    UPDATE public.repairs SET converted_to_repair = COALESCE(converted_to_repair, false) WHERE converted_to_repair IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'website_submission_id'
  ) THEN
    UPDATE public.repairs SET website_submission_id = COALESCE(website_submission_id, websiteSubmissionId) WHERE website_submission_id IS NULL AND websiteSubmissionId IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'converted_at'
  ) THEN
    UPDATE public.repairs SET converted_at = COALESCE(converted_at, convertedAt) WHERE converted_at IS NULL AND convertedAt IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'converted_by'
  ) THEN
    UPDATE public.repairs SET converted_by = COALESCE(converted_by, convertedBy) WHERE converted_by IS NULL AND convertedBy IS NOT NULL;
  END IF;

  UPDATE public.repairs
  SET "statusUpdatedAt" = COALESCE("statusUpdatedAt", "updatedAt", now())
  WHERE "statusUpdatedAt" IS NULL;

  UPDATE public.repairs
  SET "readyAt" = COALESCE("readyAt", "statusUpdatedAt")
  WHERE "readyAt" IS NULL
    AND status = 'READY';

  UPDATE public.repairs
  SET "repairOutcome" = 'NEW_MACHINE_SOLD'
  WHERE "repairOutcome" IS NULL
    AND status = 'NEW_MACHINE_SOLD';

  UPDATE public.repairs
  SET "repairOutcome" = 'MACHINE_DISCARDED'
  WHERE "repairOutcome" IS NULL
    AND status = 'MACHINE_DISCARDED';

  UPDATE public.repairs
  SET repair_outcome = COALESCE(repair_outcome, "repairOutcome")
  WHERE repair_outcome IS NULL
    AND "repairOutcome" IS NOT NULL;

  UPDATE public.repairs
  SET repair_group_id = COALESCE(repair_group_id, "repairGroupId")
  WHERE repair_group_id IS NULL
    AND "repairGroupId" IS NOT NULL;

  UPDATE public.repairs
  SET status_updated_at = COALESCE(status_updated_at, "statusUpdatedAt")
  WHERE status_updated_at IS NULL
    AND "statusUpdatedAt" IS NOT NULL;

  UPDATE public.repairs
  SET ready_at = COALESCE(ready_at, "readyAt")
  WHERE ready_at IS NULL
    AND "readyAt" IS NOT NULL;

  UPDATE public.repairs
  SET next_maintenance_date = COALESCE(next_maintenance_date, "nextMaintenanceDate")
  WHERE next_maintenance_date IS NULL
    AND "nextMaintenanceDate" IS NOT NULL;

  UPDATE public.repairs
  SET payment_method = COALESCE(payment_method, "paymentMethod")
  WHERE payment_method IS NULL
    AND "paymentMethod" IS NOT NULL;

  UPDATE public.repairs
  SET counter_note = COALESCE(counter_note, "counterNote")
  WHERE counter_note IS NULL
    AND "counterNote" IS NOT NULL;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'history'
  ) THEN
    UPDATE public.repairs SET history = '[]'::jsonb WHERE history IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'brand'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'model'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'name'
  ) THEN
    UPDATE public.repairs r
    SET
      brand = COALESCE(r.brand, m.brand),
      model = COALESCE(r.model, m.model),
      machine = COALESCE(r.machine, m.name)
    FROM public.machines m
    WHERE r."machineId" = m.id
      AND (r.brand IS NULL OR r.model IS NULL OR r.machine IS NULL);
  END IF;
END $$;

-- Align defaults with application expectations.
ALTER TABLE public.repairs
  ALTER COLUMN repair SET DEFAULT '',
  ALTER COLUMN status SET DEFAULT 'NEW',
  ALTER COLUMN source SET DEFAULT 'Balie',
  ALTER COLUMN converted_to_repair SET DEFAULT false,
  ALTER COLUMN price SET DEFAULT 0,
  ALTER COLUMN notes SET DEFAULT '',
  ALTER COLUMN "paymentStatus" SET DEFAULT 'Open',
  ALTER COLUMN "statusUpdatedAt" SET DEFAULT now(),
  ALTER COLUMN history SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS repairs_website_submission_id_idx ON public.repairs(website_submission_id) WHERE website_submission_id IS NOT NULL;

-- Normalize existing legacy statuses to the new workflow model.
DO $$
DECLARE
  repairs_status_updates bigint := 0;
  repairs_history_updates bigint := 0;
  status_history_updates bigint := 0;
BEGIN
  UPDATE public.repairs
  SET status = CASE status
    WHEN 'CHECKED_IN' THEN 'IN_WORKSHOP'
    WHEN 'DIAGNOSIS' THEN 'IN_WORKSHOP'
    WHEN 'QUOTE_PENDING' THEN 'IN_WORKSHOP'
    WHEN 'APPROVED' THEN 'IN_WORKSHOP'
    WHEN 'REPAIRING' THEN 'IN_WORKSHOP'
    WHEN 'IN_PROGRESS' THEN 'IN_WORKSHOP'
    WHEN 'READY_FOR_PICKUP' THEN 'READY'
    WHEN 'PICKED_UP' THEN 'COMPLETED'
    WHEN 'DELIVERED' THEN 'COMPLETED'
    WHEN 'ARCHIVED' THEN 'COMPLETED'
    WHEN 'NO_REPAIR' THEN 'COMPLETED'
    WHEN 'RETURNED_UNREPAIRED' THEN 'COMPLETED'
    ELSE status
  END
  WHERE status IN (
    'CHECKED_IN',
    'DIAGNOSIS',
    'QUOTE_PENDING',
    'APPROVED',
    'REPAIRING',
    'IN_PROGRESS',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'DELIVERED',
    'ARCHIVED',
    'NO_REPAIR',
    'RETURNED_UNREPAIRED'
  );
  GET DIAGNOSTICS repairs_status_updates = ROW_COUNT;

  WITH normalized_history AS (
    SELECT
      r.id,
      jsonb_agg(
        CASE
          WHEN entry ? 'status' THEN
            CASE entry->>'status'
              WHEN 'CHECKED_IN' THEN jsonb_set(entry, '{status}', to_jsonb('IN_WORKSHOP'::text), false)
              WHEN 'DIAGNOSIS' THEN jsonb_set(entry, '{status}', to_jsonb('IN_WORKSHOP'::text), false)
              WHEN 'QUOTE_PENDING' THEN jsonb_set(entry, '{status}', to_jsonb('IN_WORKSHOP'::text), false)
              WHEN 'APPROVED' THEN jsonb_set(entry, '{status}', to_jsonb('IN_WORKSHOP'::text), false)
              WHEN 'REPAIRING' THEN jsonb_set(entry, '{status}', to_jsonb('IN_WORKSHOP'::text), false)
              WHEN 'IN_PROGRESS' THEN jsonb_set(entry, '{status}', to_jsonb('IN_WORKSHOP'::text), false)
              WHEN 'READY_FOR_PICKUP' THEN jsonb_set(entry, '{status}', to_jsonb('READY'::text), false)
              WHEN 'PICKED_UP' THEN jsonb_set(entry, '{status}', to_jsonb('COMPLETED'::text), false)
              WHEN 'DELIVERED' THEN jsonb_set(entry, '{status}', to_jsonb('COMPLETED'::text), false)
              WHEN 'ARCHIVED' THEN jsonb_set(entry, '{status}', to_jsonb('COMPLETED'::text), false)
              WHEN 'NO_REPAIR' THEN jsonb_set(entry, '{status}', to_jsonb('COMPLETED'::text), false)
              WHEN 'RETURNED_UNREPAIRED' THEN jsonb_set(entry, '{status}', to_jsonb('COMPLETED'::text), false)
              ELSE entry
            END
          ELSE entry
        END
        ORDER BY ord
      ) AS new_history
    FROM public.repairs r
    CROSS JOIN LATERAL jsonb_array_elements(r.history) WITH ORDINALITY AS h(entry, ord)
    WHERE r.history IS NOT NULL
      AND jsonb_typeof(r.history) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(r.history) AS e
        WHERE e ? 'status'
          AND e->>'status' IN (
            'CHECKED_IN',
            'DIAGNOSIS',
            'QUOTE_PENDING',
            'APPROVED',
            'REPAIRING',
            'IN_PROGRESS',
            'READY_FOR_PICKUP',
            'PICKED_UP',
            'DELIVERED',
            'ARCHIVED',
            'NO_REPAIR',
            'RETURNED_UNREPAIRED'
          )
      )
    GROUP BY r.id
  )
  UPDATE public.repairs r
  SET history = nh.new_history
  FROM normalized_history nh
  WHERE r.id = nh.id;
  GET DIAGNOSTICS repairs_history_updates = ROW_COUNT;

  IF to_regclass('public.repair_status_history') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'status'
    ) THEN
    UPDATE public.repair_status_history
    SET status = CASE status
      WHEN 'CHECKED_IN' THEN 'IN_WORKSHOP'
      WHEN 'DIAGNOSIS' THEN 'IN_WORKSHOP'
      WHEN 'QUOTE_PENDING' THEN 'IN_WORKSHOP'
      WHEN 'APPROVED' THEN 'IN_WORKSHOP'
      WHEN 'REPAIRING' THEN 'IN_WORKSHOP'
      WHEN 'IN_PROGRESS' THEN 'IN_WORKSHOP'
      WHEN 'READY_FOR_PICKUP' THEN 'READY'
      WHEN 'PICKED_UP' THEN 'COMPLETED'
      WHEN 'DELIVERED' THEN 'COMPLETED'
      WHEN 'ARCHIVED' THEN 'COMPLETED'
      WHEN 'NO_REPAIR' THEN 'COMPLETED'
      WHEN 'RETURNED_UNREPAIRED' THEN 'COMPLETED'
      ELSE status
    END
    WHERE status IN (
      'CHECKED_IN',
      'DIAGNOSIS',
      'QUOTE_PENDING',
      'APPROVED',
      'REPAIRING',
      'IN_PROGRESS',
      'READY_FOR_PICKUP',
      'PICKED_UP',
      'DELIVERED',
      'ARCHIVED',
      'NO_REPAIR',
      'RETURNED_UNREPAIRED'
    );
    GET DIAGNOSTICS status_history_updates = ROW_COUNT;
  END IF;

  RAISE NOTICE 'repairs.status migrated rows: %', repairs_status_updates;
  RAISE NOTICE 'repairs.history migrated rows: %', repairs_history_updates;
  RAISE NOTICE 'repair_status_history.status migrated rows: %', status_history_updates;
END $$;

-- Optional: enforce NOT NULL only when current data is already complete.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.repairs
    WHERE customer IS NULL
      OR phone IS NULL
      OR brand IS NULL
      OR model IS NULL
      OR machine IS NULL
      OR issue IS NULL
      OR date IS NULL
      OR repair IS NULL
      OR notes IS NULL
      OR status IS NULL
      OR price IS NULL
      OR "paymentStatus" IS NULL
      OR history IS NULL
      OR source IS NULL
      OR converted_to_repair IS NULL
  ) THEN
    ALTER TABLE public.repairs
      ALTER COLUMN customer SET NOT NULL,
      ALTER COLUMN phone SET NOT NULL,
      ALTER COLUMN brand SET NOT NULL,
      ALTER COLUMN model SET NOT NULL,
      ALTER COLUMN machine SET NOT NULL,
      ALTER COLUMN issue SET NOT NULL,
      ALTER COLUMN date SET NOT NULL,
      ALTER COLUMN repair SET NOT NULL,
      ALTER COLUMN notes SET NOT NULL,
      ALTER COLUMN status SET NOT NULL,
      ALTER COLUMN price SET NOT NULL,
      ALTER COLUMN "paymentStatus" SET NOT NULL,
      ALTER COLUMN history SET NOT NULL,
      ALTER COLUMN source SET NOT NULL,
      ALTER COLUMN converted_to_repair SET NOT NULL;
  ELSE
    RAISE NOTICE 'NOT NULL constraints skipped because existing repairs rows still contain NULL values.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS repairs_customer_idx ON public.repairs("customerId");
CREATE INDEX IF NOT EXISTS repairs_machine_idx ON public.repairs("machineId");
CREATE INDEX IF NOT EXISTS repairs_status_idx ON public.repairs(status);
CREATE INDEX IF NOT EXISTS repairs_date_idx ON public.repairs("createdAt" DESC);

-- Ensure linked tables use text repair identifiers (R-2026-xxxxx format).
DO $$
DECLARE
  repairs_id_type text;
  col_type text;
  fk record;
BEGIN
  SELECT data_type INTO repairs_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'repairs' AND column_name = 'id';

  -- Drop all foreign keys that reference public.repairs(id) before changing types.
  FOR fk IN
    SELECT
      c.conname,
      n.nspname AS schema_name,
      cl.relname AS table_name
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.repairs'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', fk.schema_name, fk.table_name, fk.conname);
  END LOOP;

  IF repairs_id_type = 'uuid' THEN
    EXECUTE 'ALTER TABLE public.repairs ALTER COLUMN id TYPE text USING id::text';
  END IF;

  IF to_regclass('public.repair_status_history') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'repairId'
    ) THEN
      SELECT data_type INTO col_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'repairId';

      IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.repair_status_history ALTER COLUMN "repairId" TYPE text USING "repairId"::text';
      END IF;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'repair_id'
    ) THEN
      SELECT data_type INTO col_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'repair_id';

      IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.repair_status_history ALTER COLUMN repair_id TYPE text USING repair_id::text';
      END IF;
    END IF;
  END IF;

  IF to_regclass('public.repair_notes') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_notes' AND column_name = 'repairId'
    ) THEN
      SELECT data_type INTO col_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_notes' AND column_name = 'repairId';

      IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.repair_notes ALTER COLUMN "repairId" TYPE text USING "repairId"::text';
      END IF;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_notes' AND column_name = 'repair_id'
    ) THEN
      SELECT data_type INTO col_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_notes' AND column_name = 'repair_id';

      IF col_type = 'uuid' THEN
        EXECUTE 'ALTER TABLE public.repair_notes ALTER COLUMN repair_id TYPE text USING repair_id::text';
      END IF;
    END IF;
  END IF;

  -- Recreate expected foreign keys after type normalization.
  IF to_regclass('public.repair_status_history') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'repairId'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'repair_status_history_repairId_fkey'
          AND conrelid = 'public.repair_status_history'::regclass
      ) THEN
        EXECUTE 'ALTER TABLE public.repair_status_history ADD CONSTRAINT "repair_status_history_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES public.repairs(id) ON DELETE CASCADE';
      END IF;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_status_history' AND column_name = 'repair_id'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'repair_status_history_repair_id_fkey'
          AND conrelid = 'public.repair_status_history'::regclass
      ) THEN
        EXECUTE 'ALTER TABLE public.repair_status_history ADD CONSTRAINT repair_status_history_repair_id_fkey FOREIGN KEY (repair_id) REFERENCES public.repairs(id) ON DELETE CASCADE';
      END IF;
    END IF;
  END IF;

  IF to_regclass('public.repair_notes') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_notes' AND column_name = 'repairId'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'repair_notes_repairId_fkey'
          AND conrelid = 'public.repair_notes'::regclass
      ) THEN
        EXECUTE 'ALTER TABLE public.repair_notes ADD CONSTRAINT "repair_notes_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES public.repairs(id) ON DELETE CASCADE';
      END IF;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'repair_notes' AND column_name = 'repair_id'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'repair_notes_repair_id_fkey'
          AND conrelid = 'public.repair_notes'::regclass
      ) THEN
        EXECUTE 'ALTER TABLE public.repair_notes ADD CONSTRAINT repair_notes_repair_id_fkey FOREIGN KEY (repair_id) REFERENCES public.repairs(id) ON DELETE CASCADE';
      END IF;
    END IF;
  END IF;
END $$;

-- Verification output in SQL editor logs.
DO $$
DECLARE
  null_count bigint;
BEGIN
  SELECT count(*) INTO null_count
  FROM public.repairs
  WHERE customer IS NULL
    OR phone IS NULL
    OR brand IS NULL
    OR model IS NULL
    OR machine IS NULL
    OR issue IS NULL
    OR date IS NULL;

  RAISE NOTICE 'repairs rows with missing required frontend fields: %', null_count;
END $$;