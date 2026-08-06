import { getSupabase } from '@/lib/supabase-client';
import type { RepairStatus, RepairStatusHistory } from '@/types/repair';

type RawStatusHistory = Record<string, unknown>;

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

function normalizeStatusHistory(row: RawStatusHistory): RepairStatusHistory {
  return {
    id: String(row.id ?? ''),
    repairId: String(row.repairId ?? row.repair_id ?? ''),
    status: String(row.status ?? 'NEW') as RepairStatus,
    note: (row.note as string | undefined) ?? undefined,
    userId: (row.userId as string | undefined) ?? (row.user_id as string | undefined),
    userName: (row.userName as string | undefined) ?? (row.user_name as string | undefined),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

export async function listRepairStatusHistory(repairId: string): Promise<RepairStatusHistory[]> {
  const supabase = getSupabase();
  const repairKeyCandidates = ['repairId', 'repair_id'];
  const orderCandidates = ['createdAt', 'created_at', 'createdOn', 'created_on'];

  for (const repairKey of repairKeyCandidates) {
    for (const orderColumn of orderCandidates) {
      const { data, error } = await supabase.from('repair_status_history').select('*').eq(repairKey, repairId).order(orderColumn, { ascending: true });
      if (!error) {
        return ((data ?? []) as RawStatusHistory[]).map(normalizeStatusHistory);
      }

      if (!isMissingColumnError(error)) {
        if (isUuidSyntaxError(error)) {
          return [];
        }
        throw new Error(error.message);
      }
    }

    const { data, error } = await supabase.from('repair_status_history').select('*').eq(repairKey, repairId);
    if (!error) {
      return ((data ?? []) as RawStatusHistory[]).map(normalizeStatusHistory);
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

export async function appendRepairStatusHistory(entry: Omit<RepairStatusHistory, 'id' | 'createdAt'> & { createdAt?: string }): Promise<RepairStatusHistory> {
  const supabase = getSupabase();
  const createdAt = entry.createdAt ?? new Date().toISOString();
  const insertPayloads: Array<Record<string, unknown>> = [
    {
      repairId: entry.repairId,
      status: entry.status,
      note: entry.note,
      userId: entry.userId,
      userName: entry.userName,
      createdAt,
    },
    {
      repair_id: entry.repairId,
      status: entry.status,
      note: entry.note,
      user_id: entry.userId,
      user_name: entry.userName,
      created_at: createdAt,
    },
    {
      repairId: entry.repairId,
      status: entry.status,
      note: entry.note,
      userId: entry.userId,
      userName: entry.userName,
    },
    {
      repair_id: entry.repairId,
      status: entry.status,
      note: entry.note,
      user_id: entry.userId,
      user_name: entry.userName,
    },
  ];

  let lastError: { message?: string } | null = null;

  for (const payloadTemplate of insertPayloads) {
    const payload: Record<string, unknown> = { ...payloadTemplate };

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'undefined') {
        delete payload[key];
      }
    }

    let attempts = 0;
    while (attempts < 8) {
      attempts += 1;
      const { data, error } = await supabase.from('repair_status_history').insert(payload as never).select('*').single();
      if (!error && data) {
        return normalizeStatusHistory(data as RawStatusHistory);
      }
      if (error) {
        lastError = error;
        if (isUuidSyntaxError(error)) {
          console.warn('Skipping persistent repair status history due to UUID/text schema mismatch.', error.message);
          return {
            id: `local-${Date.now()}`,
            repairId: entry.repairId,
            status: entry.status,
            note: entry.note,
            userId: entry.userId,
            userName: entry.userName,
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

  throw new Error(lastError?.message ?? 'Statushistorie kon niet worden opgeslagen');
}

export function buildHistoryPayload(repairId: string, status: RepairStatus, userName: string, note?: string, userId?: string) {
  return {
    repairId,
    status,
    userName,
    userId,
    note,
  };
}
