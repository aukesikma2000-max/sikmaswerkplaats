-- Initial schema for Sikma's Werkplaats
-- Run this in the Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS public.customer_number_seq START 1;

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customerNumber text NOT NULL DEFAULT ('KL-' || lpad(nextval('public.customer_number_seq')::text, 5, '0')),
  firstName text,
  lastName text,
  name text NOT NULL,
  address text,
  postalCode text,
  mobilePhone text,
  landlinePhone text,
  phone text,
  email text,
  city text,
  maintenanceReminderOptIn boolean NOT NULL DEFAULT false,
  nextMaintenanceReminderDate date,
  maintenanceConsentDate timestamptz,
  maintenanceConsentMethod text,
  maintenanceConsentEmployee text,
  maintenanceReminderStatus text NOT NULL DEFAULT 'INACTIVE',
  maintenanceLastModified timestamptz,
  maintenanceUnsubscribedAt timestamptz,
  maintenanceUnsubscribeReason text,
  notes text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_number_idx ON customers(customerNumber);

CREATE TABLE IF NOT EXISTS machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customerId uuid REFERENCES customers(id) ON DELETE SET NULL,
  name text NOT NULL,
  brand text,
  model text,
  serialNumber text,
  purchaseDate date,
  notes text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS machines_customer_idx ON machines(customerId);
CREATE INDEX IF NOT EXISTS machines_name_idx ON machines(name);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'REPAIRER',
  active boolean NOT NULL DEFAULT true,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repairs (
  id text PRIMARY KEY,
  customer text NOT NULL,
  address text,
  customerId uuid REFERENCES customers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  email text,
  city text,
  brand text NOT NULL,
  model text NOT NULL,
  machine text NOT NULL,
  machineId uuid REFERENCES machines(id) ON DELETE SET NULL,
  issue text NOT NULL,
  repair text NOT NULL DEFAULT '',
  partsUsed text,
  shelfLocation text,
  priority text NOT NULL DEFAULT 'NORMAL',
  assignedTo text,
  expectedDeliveryDate text,
  repairGroupId text,
  repairOutcome text,
  source text NOT NULL DEFAULT 'Balie',
  websiteSubmissionDate timestamptz,
  websiteSubmissionId text,
  convertedToRepair boolean NOT NULL DEFAULT false,
  convertedAt timestamptz,
  convertedBy text,
  statusUpdatedAt timestamptz NOT NULL DEFAULT now(),
  readyAt timestamptz,
  nextMaintenanceDate text,
  status text NOT NULL DEFAULT 'NEW',
  date text NOT NULL,
  completionDate text,
  deliveryDate text,
  archivedDate text,
  price numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  paymentStatus text NOT NULL DEFAULT 'Open',
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repairs_customer_idx ON repairs(customerId);
CREATE INDEX IF NOT EXISTS repairs_machine_idx ON repairs(machineId);
CREATE INDEX IF NOT EXISTS repairs_status_idx ON repairs(status);
CREATE INDEX IF NOT EXISTS repairs_date_idx ON repairs(createdAt DESC);
CREATE UNIQUE INDEX IF NOT EXISTS repairs_website_submission_id_idx ON repairs(websiteSubmissionId) WHERE websiteSubmissionId IS NOT NULL;

CREATE TABLE IF NOT EXISTS repair_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repairId text NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  userId uuid REFERENCES users(id) ON DELETE SET NULL,
  userName text,
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repair_status_history_repair_idx ON repair_status_history(repairId);
CREATE INDEX IF NOT EXISTS repair_status_history_created_idx ON repair_status_history(createdAt DESC);

CREATE TABLE IF NOT EXISTS repair_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repairId text NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  note text NOT NULL,
  createdBy text,
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repair_notes_repair_idx ON repair_notes(repairId);

CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customerId uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  repairId text REFERENCES repairs(id) ON DELETE SET NULL,
  plannedFor date NOT NULL,
  status text NOT NULL DEFAULT 'PLANNED',
  channel text NOT NULL DEFAULT 'UNKNOWN',
  source text NOT NULL DEFAULT 'WORKFLOW',
  sentAt timestamptz,
  cancelledAt timestamptz,
  notes text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_reminders_customer_idx ON maintenance_reminders(customerId);
CREATE INDEX IF NOT EXISTS maintenance_reminders_planned_idx ON maintenance_reminders(plannedFor, status);

CREATE TABLE IF NOT EXISTS maintenance_service_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customerId uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  repairId text REFERENCES repairs(id) ON DELETE SET NULL,
  eventType text NOT NULL,
  note text,
  oldValue jsonb,
  newValue jsonb,
  reason text,
  actorName text,
  actorRole text,
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_service_audit_customer_idx ON maintenance_service_audit(customerId, createdAt DESC);

CREATE TABLE IF NOT EXISTS workshop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settingKey text NOT NULL UNIQUE,
  settingValue jsonb NOT NULL,
  updatedAt timestamptz NOT NULL DEFAULT now()
);
