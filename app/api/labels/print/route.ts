import { NextResponse, type NextRequest } from 'next/server';
import { printRepairLabel } from '@/lib/label-printer';
import { dispatchPrintTask } from '@/lib/print-dispatch';
import { logWorkshopAuditEvent } from '@/lib/repositories/workshop-audit-events';
import { getRepairById } from '@/lib/repositories/repairs';
import { getRequestActor } from '@/lib/server/admin-guard';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const actor = getRequestActor(request);

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const repairId = typeof body.repairId === 'string' ? body.repairId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim().toUpperCase() : 'AUTO';
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';

    if (!repairId) {
      return NextResponse.json({ ok: false, error: 'repairId ontbreekt.' }, { status: 400 });
    }

    const repair = await getRepairById(repairId);
    if (!repair) {
      return NextResponse.json({ ok: false, error: 'Reparatie niet gevonden.' }, { status: 404 });
    }

    const dedupeKey = idempotencyKey || `${repairId}:${reason}`;
    const result = await dispatchPrintTask({
      idempotencyKey: dedupeKey,
      ttlMs: reason === 'REPRINT' ? 4000 : 15000,
      attempts: 3,
      task: () => printRepairLabel(repair),
    });

    await logWorkshopAuditEvent({
      action: 'LABEL_PRINT_REQUESTED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        repairId,
        reason,
        printerTarget: result.printerTarget,
      },
    });

    return NextResponse.json({
      ok: true,
      repairId,
      reason,
      printedAt: result.printedAt,
      printerTarget: result.printerTarget,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sticker afdrukken mislukt.';

    await logWorkshopAuditEvent({
      action: 'LABEL_PRINT_FAILED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        error: message,
      },
    });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
