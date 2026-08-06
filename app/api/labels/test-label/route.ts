import { NextResponse, type NextRequest } from 'next/server';
import { printTestLabel } from '@/lib/label-printer';
import { dispatchPrintTask } from '@/lib/print-dispatch';
import { logWorkshopAuditEvent } from '@/lib/repositories/workshop-audit-events';
import { assertAdminRequest, getRequestActor } from '@/lib/server/admin-guard';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const actor = getRequestActor(request);

  try {
    assertAdminRequest(request);

    const result = await dispatchPrintTask({
      idempotencyKey: 'test-label',
      ttlMs: 3000,
      attempts: 3,
      task: () => printTestLabel(),
    });

    await logWorkshopAuditEvent({
      action: 'LABEL_TEST_PRINTED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        printerTarget: result.printerTarget,
      },
    });

    return NextResponse.json({
      ok: true,
      printerTarget: result.printerTarget,
      printedAt: result.printedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Testlabel afdrukken mislukt.';
    const status = message.includes('Alleen administrators') ? 403 : 500;

    await logWorkshopAuditEvent({
      action: 'LABEL_TEST_PRINT_FAILED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: { error: message },
    });

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
