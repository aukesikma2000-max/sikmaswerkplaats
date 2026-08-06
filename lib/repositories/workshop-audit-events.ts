import { getSupabase } from '@/lib/supabase-client';

type WorkshopAuditEventInput = {
  action: string;
  actorName?: string;
  actorRole?: string;
  metadata?: Record<string, unknown>;
};

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703'
    || error.code === 'PGRST204'
    || /column .* does not exist/i.test(error.message ?? '')
    || /could not find the '.*' column of '.*' in the schema cache/i.test(error.message ?? '')
  );
}

export async function logWorkshopAuditEvent(input: WorkshopAuditEventInput): Promise<void> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const attempts: Array<Record<string, unknown>> = [
    {
      action: input.action,
      actorName: input.actorName,
      actorRole: input.actorRole,
      metadata: input.metadata ?? {},
      createdAt: now,
    },
    {
      action: input.action,
      actor_name: input.actorName,
      actor_role: input.actorRole,
      metadata: input.metadata ?? {},
      created_at: now,
    },
  ];

  for (const payload of attempts) {
    const { error } = await supabase.from('workshop_audit_events').insert(payload);
    if (!error) return;
    if (!isMissingColumnError(error)) {
      console.warn('Audit event kon niet worden opgeslagen:', error.message);
      return;
    }
  }
}
