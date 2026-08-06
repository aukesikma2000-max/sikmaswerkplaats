import { NextResponse, type NextRequest } from 'next/server';
import {
  loadCommunicationTemplates,
  saveCommunicationTemplates,
} from '@/lib/repositories/workshop-settings';
import { assertAdminRequest, getRequestActor } from '@/lib/server/admin-guard';
import { logWorkshopAuditEvent } from '@/lib/repositories/workshop-audit-events';
import { normalizeCommunicationTemplates } from '@/lib/communication-templates';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const templates = await loadCommunicationTemplates();
    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Templates laden mislukt.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdminRequest(request);
    const actor = getRequestActor(request);
    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const templatesInput = body && typeof body === 'object'
      ? (body as Record<string, unknown>).templates
      : [];

    const templates = normalizeCommunicationTemplates(templatesInput);
    const saved = await saveCommunicationTemplates(templates);

    await logWorkshopAuditEvent({
      action: 'COMMUNICATION_TEMPLATES_UPDATED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        count: saved.length,
      },
    });

    return NextResponse.json({ ok: true, templates: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Templates opslaan mislukt.';
    const status = message.includes('Alleen administrators') ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
