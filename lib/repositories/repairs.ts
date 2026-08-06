import { getSupabase } from '@/lib/supabase-client';
import type { Repair, RepairInput, RepairStatus } from '@/types/repair';
import { normalizeWorkflowStatus } from '@/lib/workflow';

type RawRepair = Record<string, unknown>;

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703'
    || /column .* does not exist/i.test(error.message ?? '')
    || /could not find the '.*' column of '.*' in the schema cache/i.test(error.message ?? '')
  );
}

function getMissingColumnName(error: { message?: string } | null): string | null {
  if (!error?.message) return null;

  const schemaCacheMatch = error.message.match(/could not find the '([^']+)' column of '.*' in the schema cache/i);
  if (schemaCacheMatch?.[1]) {
    return schemaCacheMatch[1];
  }

  const postgresMatch = error.message.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
  if (postgresMatch?.[1]) {
    return postgresMatch[1];
  }

  return null;
}

function normalizeRepair(row: RawRepair): Repair {
  const historyValue = row.history;
  const parsedHistory = Array.isArray(historyValue) ? historyValue : [];

  return {
    id: String(row.id ?? row.repair_number ?? row.repairNumber ?? ''),
    repairNumber: String(row.repair_number ?? row.repairNumber ?? row.id ?? ''),
    repairGroupId: (row.repairGroupId as string | undefined) ?? (row.repair_group_id as string | undefined),
    repairOutcome: (row.repairOutcome as Repair['repairOutcome']) ?? (row.repair_outcome as Repair['repairOutcome']),
    source: (row.source as string | undefined) ?? (row.repair_source as string | undefined),
    websiteSubmissionDate: (row.websiteSubmissionDate as string | undefined) ?? (row.website_submission_date as string | undefined),
    websiteSubmissionId: (row.websiteSubmissionId as string | undefined) ?? (row.website_submission_id as string | undefined),
    convertedToRepair: (row.convertedToRepair as boolean | undefined) ?? (row.converted_to_repair as boolean | undefined),
    convertedAt: (row.convertedAt as string | undefined) ?? (row.converted_at as string | undefined),
    convertedBy: (row.convertedBy as string | undefined) ?? (row.converted_by as string | undefined),
    customer: String(row.customer ?? row.customer_name ?? row.name ?? ''),
    address: (row.address as string | undefined) ?? undefined,
    phone: String(row.phone ?? row.phone_number ?? ''),
    customerId: (row.customerId as string | undefined) ?? (row.customer_id as string | undefined),
    email: (row.email as string | undefined) ?? (row.email_address as string | undefined),
    city: String(row.city ?? row.place ?? ''),
    brand: String(row.brand ?? ''),
    model: String(row.model ?? ''),
    machine: String(row.machine ?? row.machine_name ?? ''),
    serialNumber: String(row.serialNumber ?? row.serial_number ?? row.serienummer ?? ''),
    machineId: (row.machineId as string | undefined) ?? (row.machine_id as string | undefined),
    issue: String(row.issue ?? row.complaint ?? ''),
    repair: String(row.repair ?? row.repair_work ?? ''),
    partsUsed: (row.partsUsed as string | undefined) ?? (row.parts_used as string | undefined),
    shelfLocation: (row.shelfLocation as string | undefined) ?? (row.shelf_location as string | undefined),
    priority: row.priority as Repair['priority'],
    assignedTo: row.assignedTo as string | undefined,
    expectedDeliveryDate: row.expectedDeliveryDate as string | undefined,
    statusUpdatedAt: (row.statusUpdatedAt as string | undefined) ?? (row.status_updated_at as string | undefined),
    readyAt: (row.readyAt as string | undefined) ?? (row.ready_at as string | undefined),
    nextMaintenanceDate: (row.nextMaintenanceDate as string | undefined) ?? (row.next_maintenance_date as string | undefined),
    status: normalizeWorkflowStatus(row.status),
    date: String(row.date ?? row.created_on ?? row.createdAt ?? row.created_at ?? ''),
    completionDate: row.completionDate as string | undefined,
    deliveryDate: row.deliveryDate as string | undefined,
    archivedDate: row.archivedDate as string | undefined,
    price: Number(row.price ?? 0),
    notes: String(row.notes ?? row.note ?? ''),
    paymentStatus: String(row.paymentStatus ?? row.payment_status ?? 'Open') as Repair['paymentStatus'],
    paymentMethod: (row.paymentMethod as Repair['paymentMethod'] | undefined) ?? (row.payment_method as Repair['paymentMethod'] | undefined),
    counterNote: (row.counterNote as string | undefined) ?? (row.counter_note as string | undefined),
    history: parsedHistory as Repair['history'],
    createdAt: (row.createdAt as string | undefined) ?? (row.created_at as string | undefined),
    updatedAt: (row.updatedAt as string | undefined) ?? (row.updated_at as string | undefined),
  };
}

function buildRepairsQuery(statuses?: RepairStatus[] | RepairStatus) {
  const supabase = getSupabase();
  let query = supabase.from('repairs').select('*');

  if (statuses) {
    const normalized = Array.isArray(statuses) ? statuses : [statuses];
    query = query.in('status', normalized);
  }

  return query;
}

async function runRepairsQueryWithOrder(statuses?: RepairStatus[] | RepairStatus) {
  const orderCandidates = ['date', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];
  let lastError: { message?: string; code?: string } | null = null;

  for (const orderColumn of orderCandidates) {
    const { data, error } = await buildRepairsQuery(statuses).order(orderColumn, { ascending: false });
    if (!error) {
      return (data ?? []) as RawRepair[];
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }

    lastError = error;
  }

  const { data, error } = await buildRepairsQuery(statuses);
  if (error) {
    throw new Error(error.message);
  }

  if (lastError) {
    console.warn('Repairs query fallback used due to missing order column.', lastError.message);
  }

  return (data ?? []) as RawRepair[];
}

export async function listRepairs(statuses?: RepairStatus[] | RepairStatus): Promise<Repair[]> {
  const data = await runRepairsQueryWithOrder(statuses);
  return data.map(normalizeRepair);
}

export async function searchRepairs(queryText: string, statuses?: RepairStatus[] | RepairStatus): Promise<Repair[]> {
  const normalizedQuery = queryText.trim().toLowerCase();
  const searchCandidates = [
    'customer',
    'customer_name',
    'name',
    'phone',
    'phone_number',
    'machine',
    'machine_name',
    'brand',
    'model',
    'issue',
    'complaint',
  ];

  const buildSearchQuery = () => {
    const supabase = getSupabase();
    let query = supabase.from('repairs').select('*');

    if (statuses) {
      const normalized = Array.isArray(statuses) ? statuses : [statuses];
      query = query.in('status', normalized);
    }

    if (normalizedQuery) {
      query = query.or(searchCandidates.map((field) => `${field}.ilike.%${normalizedQuery}%`).join(','));
    }

    return query;
  };

  const orderCandidates = ['date', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];

  for (const orderColumn of orderCandidates) {
    const { data, error } = await buildSearchQuery().order(orderColumn, { ascending: false });
    if (!error) {
      return ((data ?? []) as RawRepair[]).map(normalizeRepair);
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }
  }

  const { data, error } = await buildSearchQuery();
  if (error) throw new Error(error.message);
  return ((data ?? []) as RawRepair[]).map(normalizeRepair);
}

export async function getRepairById(id: string): Promise<Repair | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('repairs').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeRepair(data as RawRepair) : null;
}

export async function getRepairByWebsiteSubmissionId(websiteSubmissionId: string): Promise<Repair | null> {
  const supabase = getSupabase();
  const keyCandidates = ['websiteSubmissionId', 'website_submission_id'];

  for (const key of keyCandidates) {
    const { data, error } = await supabase.from('repairs').select('*').eq(key, websiteSubmissionId).maybeSingle();
    if (!error) {
      return data ? normalizeRepair(data as RawRepair) : null;
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }
  }

  return null;
}

export async function createRepair(repair: Repair): Promise<Repair> {
  const supabase = getSupabase();

  const insertPayloads: Array<Record<string, unknown>> = [
    {
      id: repair.id,
      repair_number: repair.id,
      repairNumber: repair.id,
      customer: repair.customer,
      address: repair.address,
      customerId: repair.customerId,
      phone: repair.phone,
      email: repair.email,
      city: repair.city,
      brand: repair.brand,
      model: repair.model,
      machine: repair.machine,
      machineId: repair.machineId,
      issue: repair.issue,
      repair: repair.repair,
      partsUsed: repair.partsUsed,
      shelfLocation: repair.shelfLocation,
      priority: repair.priority,
      assignedTo: repair.assignedTo,
      expectedDeliveryDate: repair.expectedDeliveryDate,
      statusUpdatedAt: repair.statusUpdatedAt,
      status_updated_at: repair.statusUpdatedAt,
      readyAt: repair.readyAt,
      ready_at: repair.readyAt,
      nextMaintenanceDate: repair.nextMaintenanceDate,
      next_maintenance_date: repair.nextMaintenanceDate,
      repairOutcome: repair.repairOutcome,
      repair_outcome: repair.repairOutcome,
      repairGroupId: repair.repairGroupId,
      repair_group_id: repair.repairGroupId,
      status: repair.status,
      source: repair.source,
      repair_source: repair.source,
      websiteSubmissionDate: repair.websiteSubmissionDate,
      website_submission_date: repair.websiteSubmissionDate,
      websiteSubmissionId: repair.websiteSubmissionId,
      website_submission_id: repair.websiteSubmissionId,
      convertedToRepair: repair.convertedToRepair,
      converted_to_repair: repair.convertedToRepair,
      convertedAt: repair.convertedAt,
      converted_at: repair.convertedAt,
      convertedBy: repair.convertedBy,
      converted_by: repair.convertedBy,
      date: repair.date,
      completionDate: repair.completionDate,
      deliveryDate: repair.deliveryDate,
      archivedDate: repair.archivedDate,
      price: repair.price,
      notes: repair.notes,
      paymentStatus: repair.paymentStatus,
      paymentMethod: repair.paymentMethod,
      payment_method: repair.paymentMethod,
      counterNote: repair.counterNote,
      counter_note: repair.counterNote,
      history: repair.history,
      createdAt: repair.createdAt,
      updatedAt: repair.updatedAt,
      serialNumber: repair.serialNumber,
      serial_number: repair.serialNumber,
    },
  ];

  let lastError: { message?: string } | null = null;

  for (const payloadTemplate of insertPayloads) {
    const payload: Record<string, unknown> = { ...payloadTemplate };

    // Remove undefined values so optional fields don't trigger schema cache misses.
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'undefined') {
        delete payload[key];
      }
    }

    let attempts = 0;
    while (attempts < 8) {
      attempts += 1;
      const { data, error } = await supabase.from('repairs').insert(payload as never).select('*').single();

      if (!error && data) {
        return normalizeRepair(data as RawRepair);
      }

      if (!error) {
        break;
      }

      lastError = error;

      if (!isMissingColumnError(error)) {
        break;
      }

      const missingColumn = getMissingColumnName(error);
      if (!missingColumn || !(missingColumn in payload)) {
        break;
      }

      delete payload[missingColumn];
    }
  }

  throw new Error(lastError?.message ?? 'Reparatie kon niet worden opgeslagen');
}

export async function updateRepair(id: string, patch: Partial<Repair>): Promise<Repair> {
  const supabase = getSupabase();
  const payload: Record<string, unknown> = {
    ...patch,
    repairOutcome: patch.repairOutcome,
    repair_outcome: patch.repairOutcome,
    repairGroupId: patch.repairGroupId,
    repair_group_id: patch.repairGroupId,
    statusUpdatedAt: patch.statusUpdatedAt,
    status_updated_at: patch.statusUpdatedAt,
    source: patch.source,
    repair_source: patch.source,
    websiteSubmissionDate: patch.websiteSubmissionDate,
    website_submission_date: patch.websiteSubmissionDate,
    websiteSubmissionId: patch.websiteSubmissionId,
    website_submission_id: patch.websiteSubmissionId,
    convertedToRepair: patch.convertedToRepair,
    converted_to_repair: patch.convertedToRepair,
    convertedAt: patch.convertedAt,
    converted_at: patch.convertedAt,
    convertedBy: patch.convertedBy,
    converted_by: patch.convertedBy,
    readyAt: patch.readyAt,
    ready_at: patch.readyAt,
    nextMaintenanceDate: patch.nextMaintenanceDate,
    next_maintenance_date: patch.nextMaintenanceDate,
    paymentMethod: patch.paymentMethod,
    payment_method: patch.paymentMethod,
    counterNote: patch.counterNote,
    counter_note: patch.counterNote,
  };

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'undefined') {
      delete payload[key];
    }
  }

  let attempts = 0;
  while (attempts < 10) {
    attempts += 1;
    const { data, error } = await supabase.from('repairs').update(payload).eq('id', id).select('*').single();
    if (!error && data) {
      return normalizeRepair(data as RawRepair);
    }

    if (!error) {
      break;
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !(missingColumn in payload)) {
      throw new Error(error.message);
    }

    delete payload[missingColumn];
  }

  throw new Error('Reparatie kon niet worden bijgewerkt');
}

export async function nextRepairId(): Promise<string> {
  const supabase = getSupabase();
  const { count, error } = await supabase.from('repairs').select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  const nextNumber = (count ?? 0) + 1;
  return `R-2026-${String(nextNumber).padStart(5, '0')}`;
}

export async function listRepairsByMachineId(machineId: string): Promise<Repair[]> {
  const supabase = getSupabase();
  const candidates = ['machineId', 'machine_id'];
  let lastError: { message?: string } | null = null;

  for (const col of candidates) {
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .eq(col, machineId)
      .in('status', ['COMPLETED'])
      .limit(10);

    if (!error) return ((data ?? []) as RawRepair[]).map(normalizeRepair);
    if (!isMissingColumnError(error)) throw new Error(error.message);
    lastError = error;
  }

  console.warn('listRepairsByMachineId: no working column found', lastError?.message);
  return [];
}
