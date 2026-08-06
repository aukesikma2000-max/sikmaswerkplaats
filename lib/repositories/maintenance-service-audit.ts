import { getSupabase } from '@/lib/supabase-client';
import type { MaintenanceServiceAudit } from '@/types/repair';

type RawAudit = Record<string, unknown>;

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703'
    || /column .* does not exist/i.test(error.message ?? '')
    || /could not find the '.*' column of '.*' in the schema cache/i.test(error.message ?? '')
  );
}

function normalizeAudit(row: RawAudit): MaintenanceServiceAudit {
  return {
    id: String(row.id ?? ''),
    customerId: String(row.customerId ?? row.customer_id ?? ''),
    repairId: (row.repairId as string | undefined) ?? (row.repair_id as string | undefined),
    eventType: String(row.eventType ?? row.event_type ?? 'UPDATED'),
    note: (row.note as string | undefined) ?? undefined,
    oldValue: (row.oldValue as Record<string, unknown> | undefined) ?? (row.old_value as Record<string, unknown> | undefined),
    newValue: (row.newValue as Record<string, unknown> | undefined) ?? (row.new_value as Record<string, unknown> | undefined),
    reason: (row.reason as string | undefined) ?? undefined,
    actorName: (row.actorName as string | undefined) ?? (row.actor_name as string | undefined),
    actorRole: (row.actorRole as string | undefined) ?? (row.actor_role as string | undefined),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

export type MaintenanceServiceAuditInput = {
  customerId: string;
  repairId?: string;
  eventType: string;
  note?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  actorName?: string;
  actorRole?: string;
};

export async function logMaintenanceServiceAudit(input: MaintenanceServiceAuditInput): Promise<MaintenanceServiceAudit> {
  const supabase = getSupabase();
  const payloads: Array<Record<string, unknown>> = [
    {
      customerId: input.customerId,
      repairId: input.repairId,
      eventType: input.eventType,
      note: input.note,
      oldValue: input.oldValue,
      newValue: input.newValue,
      reason: input.reason,
      actorName: input.actorName,
      actorRole: input.actorRole,
      createdAt: new Date().toISOString(),
    },
    {
      customer_id: input.customerId,
      repair_id: input.repairId,
      event_type: input.eventType,
      note: input.note,
      old_value: input.oldValue,
      new_value: input.newValue,
      reason: input.reason,
      actor_name: input.actorName,
      actor_role: input.actorRole,
      created_at: new Date().toISOString(),
    },
  ];

  let lastError: { message?: string } | null = null;

  for (const payload of payloads) {
    const cleanPayload = { ...payload };
    for (const [key, value] of Object.entries(cleanPayload)) {
      if (typeof value === 'undefined') {
        delete cleanPayload[key];
      }
    }

    const { data, error } = await supabase
      .from('maintenance_service_audit')
      .insert(cleanPayload as never)
      .select('*')
      .single();

    if (!error && data) {
      return normalizeAudit(data as RawAudit);
    }

    if (error) {
      lastError = error;
      if (!isMissingColumnError(error)) {
        throw new Error(error.message);
      }
    }
  }

  throw new Error(lastError?.message ?? 'Auditlog kon niet worden opgeslagen.');
}

export async function listMaintenanceServiceAuditByCustomer(customerId: string): Promise<MaintenanceServiceAudit[]> {
  const supabase = getSupabase();

  for (const customerCol of ['customerId', 'customer_id']) {
    for (const orderCol of ['createdAt', 'created_at']) {
      const { data, error } = await supabase
        .from('maintenance_service_audit')
        .select('*')
        .eq(customerCol, customerId)
        .order(orderCol, { ascending: false });

      if (!error) {
        return ((data ?? []) as RawAudit[]).map(normalizeAudit);
      }

      if (!isMissingColumnError(error)) {
        throw new Error(error.message);
      }
    }
  }

  return [];
}
