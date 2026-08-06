import { getSupabase } from '@/lib/supabase-client';
import type { Machine } from '@/types/repair';

type RawMachine = Record<string, unknown>;

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === '42703' || /column .* does not exist/i.test(error.message ?? '');
}

function normalizeMachine(row: RawMachine): Machine {
  return {
    id: String(row.id ?? ''),
    customerId: (row.customerId as string | undefined) ?? (row.customer_id as string | undefined),
    name: String(row.name ?? row.machine_name ?? row.naam ?? [row.brand, row.model].filter(Boolean).join(' ')),
    brand: (row.brand as string | undefined) ?? (row.merk as string | undefined),
    model: (row.model as string | undefined) ?? (row.type as string | undefined),
    serialNumber: (row.serialNumber as string | undefined) ?? (row.serial_number as string | undefined) ?? (row.serienummer as string | undefined),
    purchaseDate: (row.purchaseDate as string | undefined) ?? (row.purchase_date as string | undefined),
    notes: (row.notes as string | undefined) ?? (row.note as string | undefined),
    createdAt: (row.createdAt as string | undefined) ?? (row.created_at as string | undefined),
    updatedAt: (row.updatedAt as string | undefined) ?? (row.updated_at as string | undefined),
  };
}

export type MachineInput = {
  customerId?: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  notes?: string;
};

export async function listMachines(): Promise<Machine[]> {
  const supabase = getSupabase();
  const orderCandidates = ['name', 'machine_name', 'naam', 'brand', 'model', 'createdAt', 'created_at'];

  for (const orderColumn of orderCandidates) {
    const { data, error } = await supabase.from('machines').select('*').order(orderColumn, { ascending: true });
    if (!error) {
      return ((data ?? []) as RawMachine[]).map(normalizeMachine);
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }
  }

  const { data, error } = await supabase.from('machines').select('*');
  if (error) throw new Error(error.message);
  return ((data ?? []) as RawMachine[]).map(normalizeMachine);
}

export async function getMachineById(id: string): Promise<Machine | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('machines').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeMachine(data as RawMachine) : null;
}

export async function getMachinesByCustomerId(customerId: string): Promise<Machine[]> {
  const supabase = getSupabase();
  const keyCandidates = ['customerId', 'customer_id'];
  const orderCandidates = ['name', 'machine_name', 'naam', 'brand', 'model', 'createdAt', 'created_at'];
  let lastError: { message?: string } | null = null;

  for (const key of keyCandidates) {
    for (const orderColumn of orderCandidates) {
      const { data, error } = await supabase.from('machines').select('*').eq(key, customerId).order(orderColumn, { ascending: true });
      if (!error) {
        return ((data ?? []) as RawMachine[]).map(normalizeMachine);
      }

      if (!isMissingColumnError(error)) {
        lastError = error;
        break;
      }
    }

    const { data, error } = await supabase.from('machines').select('*').eq(key, customerId);
    if (!error) {
      return ((data ?? []) as RawMachine[]).map(normalizeMachine);
    }
    if (!isMissingColumnError(error)) {
      lastError = error;
    }
  }

  if (lastError) {
    throw new Error(lastError.message);
  }

  return [];
}

export async function findOrCreateMachine(input: MachineInput): Promise<Machine> {
  const supabase = getSupabase();
  const customerKeyCandidates = ['customerId', 'customer_id'];
  const nameKeyCandidates = ['name', 'machine_name', 'naam'];

  if (input.customerId && input.name) {
    for (const customerKey of customerKeyCandidates) {
      for (const nameKey of nameKeyCandidates) {
        const { data: byCustomerAndName, error: lookupError } = await supabase
          .from('machines')
          .select('*')
          .eq(customerKey, input.customerId)
          .eq(nameKey, input.name)
          .maybeSingle();
        if (!lookupError && byCustomerAndName) return normalizeMachine(byCustomerAndName as RawMachine);
        if (lookupError && !isMissingColumnError(lookupError)) throw new Error(lookupError.message);
      }
    }
  }

  if (input.brand && input.model) {
    for (const customerKey of customerKeyCandidates) {
      let machineQuery = supabase.from('machines').select('*').eq('brand', input.brand).eq('model', input.model);
      if (input.customerId) {
        machineQuery = machineQuery.eq(customerKey, input.customerId);
      }

      const { data: byBrandAndModel, error: brandModelError } = await machineQuery.maybeSingle();
      if (!brandModelError && byBrandAndModel) return normalizeMachine(byBrandAndModel as RawMachine);
      if (brandModelError && !isMissingColumnError(brandModelError)) throw new Error(brandModelError.message);
    }
  }

  const insertPayloads: Array<Record<string, unknown>> = [
    {
      customerId: input.customerId,
      name: input.name,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber,
      purchaseDate: input.purchaseDate,
      notes: input.notes,
    },
    {
      customer_id: input.customerId,
      machine_name: input.name,
      brand: input.brand,
      model: input.model,
      serial_number: input.serialNumber,
      purchase_date: input.purchaseDate,
      note: input.notes,
    },
    {
      customer_id: input.customerId,
      naam: input.name,
      merk: input.brand,
      type: input.model,
      serienummer: input.serialNumber,
      purchase_date: input.purchaseDate,
      notes: input.notes,
    },
  ];

  let lastError: { message?: string } | null = null;

  for (const payload of insertPayloads) {
    const { data, error } = await supabase.from('machines').insert(payload as never).select('*').single();
    if (!error && data) return normalizeMachine(data as RawMachine);
    if (error) {
      lastError = error;
      if (!isMissingColumnError(error)) break;
    }
  }

  throw new Error(lastError?.message ?? 'Machine kon niet worden opgeslagen');
}
