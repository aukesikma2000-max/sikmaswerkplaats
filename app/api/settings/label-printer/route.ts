import { NextResponse, type NextRequest } from 'next/server';
import { saveLabelPrinterSettings, loadLabelPrinterSettings } from '@/lib/repositories/workshop-settings';
import { assertAdminRequest, getRequestActor } from '@/lib/server/admin-guard';
import { logWorkshopAuditEvent } from '@/lib/repositories/workshop-audit-events';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const settings = await loadLabelPrinterSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Instellingen laden mislukt.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdminRequest(request);
    const actor = getRequestActor(request);

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const printerName = typeof body.printerName === 'string' ? body.printerName : '';
    const host = typeof body.host === 'string' ? body.host : '';
    const port = Number(body.port ?? 9100);
    const enabled = body.enabled === true;
    const mockMode = body.mockMode === true;

    const saved = await saveLabelPrinterSettings({
      printerName,
      host,
      port,
      enabled,
      mockMode,
    });

    await logWorkshopAuditEvent({
      action: 'LABEL_PRINTER_SETTINGS_UPDATED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        enabled: saved.enabled,
        mockMode: saved.mockMode,
        host: saved.host,
        port: saved.port,
      },
    });

    return NextResponse.json({ ok: true, settings: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Instellingen opslaan mislukt.';
    const status = message.includes('Alleen administrators') ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
