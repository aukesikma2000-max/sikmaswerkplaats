import { getSupabase } from '@/lib/supabase-client';
import type { MaintenanceReminder } from '@/types/repair';

type RawReminder = Record<string, unknown>;

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703'
    || /column .* does not exist/i.test(error.message ?? '')
    || /could not find the '.*' column of '.*' in the schema cache/i.test(error.message ?? '')
  );
}

function normalizeReminder(row: RawReminder): MaintenanceReminder {
  return {
    id: String(row.id ?? ''),
    customerId: String(row.customerId ?? row.customer_id ?? ''),
    repairId: (row.repairId as string | undefined) ?? (row.repair_id as string | undefined),
    plannedFor: String(row.plannedFor ?? row.planned_for ?? ''),
    status: String(row.status ?? 'PLANNED') as MaintenanceReminder['status'],
    channel: String(row.channel ?? 'UNKNOWN') as MaintenanceReminder['channel'],
    source: String(row.source ?? 'WORKFLOW'),
    sentAt: (row.sentAt as string | undefined) ?? (row.sent_at as string | undefined),
    cancelledAt: (row.cancelledAt as string | undefined) ?? (row.cancelled_at as string | undefined),
    notes: (row.notes as string | undefined) ?? undefined,
    createdAt: (row.createdAt as string | undefined) ?? (row.created_at as string | undefined),
    updatedAt: (row.updatedAt as string | undefined) ?? (row.updated_at as string | undefined),
  };
}

export type ScheduleMaintenanceReminderInput = {
  customerId: string;
  repairId?: string;
  plannedFor: string;
  source: string;
  notes?: string;
};

export async function scheduleMaintenanceReminder(input: ScheduleMaintenanceReminderInput): Promise<MaintenanceReminder> {
  const supabase = getSupabase();

  // Avoid duplicate planned reminders for the same customer/date.
  for (const customerCol of ['customerId', 'customer_id']) {
    for (const dateCol of ['plannedFor', 'planned_for']) {
      const { data, error } = await supabase
        .from('maintenance_reminders')
        .select('*')
        .eq(customerCol, input.customerId)
        .eq(dateCol, input.plannedFor)
        .in('status', ['PLANNED'])
        .maybeSingle();

      if (!error && data) {
        return normalizeReminder(data as RawReminder);
      }

      if (error && !isMissingColumnError(error)) {
        throw new Error(error.message);
      }
    }
  }

  const payloads: Array<Record<string, unknown>> = [
    {
      customerId: input.customerId,
      repairId: input.repairId,
      plannedFor: input.plannedFor,
      status: 'PLANNED',
      channel: 'UNKNOWN',
      source: input.source,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      customer_id: input.customerId,
      repair_id: input.repairId,
      planned_for: input.plannedFor,
      status: 'PLANNED',
      channel: 'UNKNOWN',
      source: input.source,
      notes: input.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    const { data, error } = await supabase.from('maintenance_reminders').insert(cleanPayload as never).select('*').single();
    if (!error && data) {
      return normalizeReminder(data as RawReminder);
    }

    if (error) {
      lastError = error;
      if (!isMissingColumnError(error)) {
        throw new Error(error.message);
      }
    }
  }

  throw new Error(lastError?.message ?? 'Onderhoudsherinnering kon niet worden ingepland.');
}
