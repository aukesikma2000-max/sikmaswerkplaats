import { getSupabase } from '@/lib/supabase-client';
import type { CommunicationChannel, CommunicationEvent, CommunicationStatus, CommunicationType } from '@/types/repair';

type RawCommunication = Record<string, unknown>;

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703'
    || /column .* does not exist/i.test(error.message ?? '')
    || /could not find the '.*' column of '.*' in the schema cache/i.test(error.message ?? '')
  );
}

function normalizeCommunication(row: RawCommunication): CommunicationEvent {
  return {
    id: String(row.id ?? ''),
    customerId: (row.customerId as string | undefined) ?? (row.customer_id as string | undefined),
    repairId: (row.repairId as string | undefined) ?? (row.repair_id as string | undefined),
    machineId: (row.machineId as string | undefined) ?? (row.machine_id as string | undefined),
    channel: String(row.channel ?? row.communication_channel ?? 'OTHER') as CommunicationChannel,
    type: String(row.type ?? row.communication_type ?? 'OTHER') as CommunicationType,
    occurredAt: String(row.occurredAt ?? row.occurred_at ?? row.sentAt ?? row.sent_at ?? row.createdAt ?? row.created_at ?? ''),
    actorName: (row.actorName as string | undefined) ?? (row.actor_name as string | undefined),
    actorId: (row.actorId as string | undefined) ?? (row.actor_id as string | undefined),
    subject: (row.subject as string | undefined) ?? undefined,
    messageBody: (row.messageBody as string | undefined) ?? (row.message_body as string | undefined),
    status: String(row.status ?? row.delivery_status ?? 'LOGGED') as CommunicationStatus,
    isAutomatic: typeof row.isAutomatic === 'boolean' ? row.isAutomatic : (typeof row.is_automatic === 'boolean' ? row.is_automatic : undefined),
    errorMessage: (row.errorMessage as string | undefined) ?? (row.error_message as string | undefined),
    attachmentUrl: (row.attachmentUrl as string | undefined) ?? (row.attachment_url as string | undefined),
    metadata: (row.metadata as Record<string, unknown> | undefined) ?? undefined,
    createdAt: (row.createdAt as string | undefined) ?? (row.created_at as string | undefined),
    updatedAt: (row.updatedAt as string | undefined) ?? (row.updated_at as string | undefined),
  };
}

export type CommunicationEventInput = {
  customerId?: string;
  repairId?: string;
  machineId?: string;
  channel: CommunicationChannel;
  type?: CommunicationType;
  occurredAt?: string;
  actorName?: string;
  actorId?: string;
  subject?: string;
  messageBody?: string;
  status?: CommunicationStatus;
  isAutomatic?: boolean;
  errorMessage?: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
};

export async function listCommunicationEventsByRepairIds(repairIds: string[]): Promise<CommunicationEvent[]> {
  if (!repairIds.length) return [];

  const supabase = getSupabase();
  const repairColumns = ['repairId', 'repair_id'];
  const orderColumns = ['occurredAt', 'occurred_at', 'createdAt', 'created_at'];

  for (const repairColumn of repairColumns) {
    for (const orderColumn of orderColumns) {
      const { data, error } = await supabase
        .from('communication_events')
        .select('*')
        .in(repairColumn, repairIds)
        .order(orderColumn, { ascending: false });

      if (!error) {
        return ((data ?? []) as RawCommunication[]).map(normalizeCommunication);
      }

      if (!isMissingColumnError(error)) {
        throw new Error(error.message);
      }
    }
  }

  return [];
}

export async function listCommunicationEventsByRepairAndChannel(
  repairId: string,
  channel: CommunicationChannel,
): Promise<CommunicationEvent[]> {
  const supabase = getSupabase();
  const repairColumns = ['repairId', 'repair_id'];
  const channelColumns = ['channel', 'communication_channel'];
  const orderColumns = ['occurredAt', 'occurred_at', 'createdAt', 'created_at'];

  for (const repairColumn of repairColumns) {
    for (const channelColumn of channelColumns) {
      for (const orderColumn of orderColumns) {
        const { data, error } = await supabase
          .from('communication_events')
          .select('*')
          .eq(repairColumn, repairId)
          .eq(channelColumn, channel)
          .order(orderColumn, { ascending: false });

        if (!error) {
          return ((data ?? []) as RawCommunication[]).map(normalizeCommunication);
        }

        if (!isMissingColumnError(error)) {
          throw new Error(error.message);
        }
      }
    }
  }

  return [];
}

export async function logCommunicationEvent(input: CommunicationEventInput): Promise<CommunicationEvent> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const occurredAt = input.occurredAt ?? now;

  const payloads: Array<Record<string, unknown>> = [
    {
      customerId: input.customerId,
      repairId: input.repairId,
      machineId: input.machineId,
      channel: input.channel,
      type: input.type,
      occurredAt,
      actorName: input.actorName,
      actorId: input.actorId,
      subject: input.subject,
      messageBody: input.messageBody,
      status: input.status ?? 'LOGGED',
      isAutomatic: input.isAutomatic ?? false,
      errorMessage: input.errorMessage,
      attachmentUrl: input.attachmentUrl,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    },
    {
      customer_id: input.customerId,
      repair_id: input.repairId,
      machine_id: input.machineId,
      communication_channel: input.channel,
      communication_type: input.type,
      occurred_at: occurredAt,
      actor_name: input.actorName,
      actor_id: input.actorId,
      subject: input.subject,
      message_body: input.messageBody,
      status: input.status ?? 'LOGGED',
      is_automatic: input.isAutomatic ?? false,
      error_message: input.errorMessage,
      attachment_url: input.attachmentUrl,
      metadata: input.metadata,
      created_at: now,
      updated_at: now,
    },
  ];

  let lastError: { message?: string } | null = null;

  for (const payloadTemplate of payloads) {
    const payload = { ...payloadTemplate };
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'undefined') {
        delete payload[key];
      }
    }

    const { data, error } = await supabase.from('communication_events').insert(payload as never).select('*').single();
    if (!error && data) {
      return normalizeCommunication(data as RawCommunication);
    }

    if (error) {
      lastError = error;
      if (!isMissingColumnError(error)) {
        throw new Error(error.message);
      }
    }
  }

  throw new Error(lastError?.message ?? 'Communicatie-event kon niet worden opgeslagen.');
}
