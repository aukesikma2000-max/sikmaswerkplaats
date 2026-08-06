import { NextResponse, type NextRequest } from 'next/server';
import { testLabelPrinterConnection } from '@/lib/label-printer';
import { logWorkshopAuditEvent } from '@/lib/repositories/workshop-audit-events';
import { getRequestActor } from '@/lib/server/admin-guard';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const actor = getRequestActor(request);

  try {
    const result = await testLabelPrinterConnection();

    await logWorkshopAuditEvent({
      action: 'LABEL_PRINTER_CONNECTION_TESTED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        printerTarget: result.printerTarget,
      },
    });

    return NextResponse.json({
      ok: true,
      printerTarget: result.printerTarget,
      checkedAt: result.checkedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Printertest mislukt.';

    await logWorkshopAuditEvent({
      action: 'LABEL_PRINTER_CONNECTION_TEST_FAILED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: { error: message },
    });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
