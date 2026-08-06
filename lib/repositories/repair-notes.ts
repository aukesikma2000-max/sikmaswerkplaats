import { getSupabase } from '@/lib/supabase-client';
import type { RepairNote } from '@/types/repair';

type RawRepairNote = Record<string, unknown>;

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703'
    || /column .* does not exist/i.test(error.message ?? '')
    || /could not find the '.*' column of '.*' in the schema cache/i.test(error.message ?? '')
  );
}

function isUuidSyntaxError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === '22P02' || /invalid input syntax for type uuid/i.test(error.message ?? '');
}

function getMissingColumnName(error: { message?: string } | null): string | null {
  if (!error?.message) return null;

  const schemaCacheMatch = error.message.match(/could not find the '([^']+)' column of '.*' in the schema cache/i);
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1];

  const postgresMatch = error.message.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
  if (postgresMatch?.[1]) return postgresMatch[1];

  return null;
}

function normalizeRepairNote(row: RawRepairNote): RepairNote {
  return {
    id: String(row.id ?? ''),
    repairId: String(row.repairId ?? row.repair_id ?? ''),
    note: String(row.note ?? ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    createdBy: (row.createdBy as string | undefined) ?? (row.created_by as string | undefined),
  };
}

export async function listRepairNotes(repairId: string): Promise<RepairNote[]> {
  const supabase = getSupabase();
  const repairKeyCandidates = ['repairId', 'repair_id'];
  const orderCandidates = ['createdAt', 'created_at', 'createdOn', 'created_on'];

  for (const repairKey of repairKeyCandidates) {
    for (const orderColumn of orderCandidates) {
      const { data, error } = await supabase.from('repair_notes').select('*').eq(repairKey, repairId).order(orderColumn, { ascending: true });
      if (!error) {
        return ((data ?? []) as RawRepairNote[]).map(normalizeRepairNote);
      }
      if (!isMissingColumnError(error)) {
        if (isUuidSyntaxError(error)) {
          return [];
        }
        throw new Error(error.message);
      }
    }

    const { data, error } = await supabase.from('repair_notes').select('*').eq(repairKey, repairId);
    if (!error) {
      return ((data ?? []) as RawRepairNote[]).map(normalizeRepairNote);
    }
    if (!isMissingColumnError(error)) {
      if (isUuidSyntaxError(error)) {
        return [];
      }
      throw new Error(error.message);
    }
  }

  return [];
}

export async function addRepairNote(note: Omit<RepairNote, 'id' | 'createdAt'> & { createdAt?: string }): Promise<RepairNote> {
  const supabase = getSupabase();
  const createdAt = note.createdAt ?? new Date().toISOString();
  const payloads: Array<Record<string, unknown>> = [
    {
      repairId: note.repairId,
      note: note.note,
      createdBy: note.createdBy,
      createdAt,
    },
    {
      repair_id: note.repairId,
      note: note.note,
      created_by: note.createdBy,
      created_at: createdAt,
    },
    {
      repairId: note.repairId,
      note: note.note,
      createdBy: note.createdBy,
    },
    {
      repair_id: note.repairId,
      note: note.note,
      created_by: note.createdBy,
    },
  ];

  let lastError: { message?: string } | null = null;

  for (const payloadTemplate of payloads) {
    const payload: Record<string, unknown> = { ...payloadTemplate };

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'undefined') {
        delete payload[key];
      }
    }

    let attempts = 0;
    while (attempts < 8) {
      attempts += 1;
      const { data, error } = await supabase.from('repair_notes').insert(payload as never).select('*').single();
      if (!error && data) {
        return normalizeRepairNote(data as RawRepairNote);
      }
      if (error) {
        lastError = error;
        if (isUuidSyntaxError(error)) {
          console.warn('Skipping persistent repair note due to UUID/text schema mismatch.', error.message);
          return {
            id: `local-${Date.now()}`,
            repairId: note.repairId,
            note: note.note,
            createdBy: note.createdBy,
            createdAt,
          };
        }
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
  }

  throw new Error(lastError?.message ?? 'Notitie kon niet worden opgeslagen');
}
