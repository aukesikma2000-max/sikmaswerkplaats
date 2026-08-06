import { NextResponse, type NextRequest } from 'next/server';
import { getRequestActor } from '@/lib/server/admin-guard';
import { getCustomerById } from '@/lib/repositories/customers';
import { sendWorkshopEmail } from '@/lib/server/resend-mail';
import { logCommunicationEvent } from '@/lib/repositories/communications';
import { logWorkshopAuditEvent } from '@/lib/repositories/workshop-audit-events';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const actor = getRequestActor(request);

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const customerId = typeof body.customerId === 'string' ? body.customerId.trim() : '';
    const repairId = typeof body.repairId === 'string' ? body.repairId.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const messageBody = typeof body.messageBody === 'string' ? body.messageBody.trim() : '';
    const manualApproval = body.manualApproval === true;

    if (!customerId) {
      return NextResponse.json({ ok: false, error: 'customerId ontbreekt.' }, { status: 400 });
    }

    if (!subject || !messageBody) {
      return NextResponse.json({ ok: false, error: 'Onderwerp en bericht zijn verplicht voor e-mail.' }, { status: 400 });
    }

    if (!manualApproval) {
      return NextResponse.json({ ok: false, error: 'Handmatige akkoord is verplicht voor verzending.' }, { status: 400 });
    }

    const customer = await getCustomerById(customerId);
    const recipient = customer?.email?.trim();
    if (!recipient) {
      return NextResponse.json({ ok: false, error: 'Klant heeft geen e-mailadres.' }, { status: 400 });
    }

    const delivery = await sendWorkshopEmail({
      to: recipient,
      subject,
      messageBody,
      repairId: repairId || undefined,
    });

    const communication = await logCommunicationEvent({
      customerId,
      repairId: repairId || undefined,
      channel: 'EMAIL',
      type: 'CUSTOMER',
      actorName: actor.name,
      subject,
      messageBody,
      status: 'SENT',
      isAutomatic: false,
      metadata: {
        provider: 'resend',
        messageId: delivery.messageId,
      },
    });

    await logWorkshopAuditEvent({
      action: 'CUSTOMER_EMAIL_SENT',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        customerId,
        repairId: repairId || null,
        messageId: delivery.messageId,
      },
    });

    return NextResponse.json({ ok: true, communication, messageId: delivery.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'E-mail verzenden mislukt.';

    await logWorkshopAuditEvent({
      action: 'CUSTOMER_EMAIL_SEND_FAILED',
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        error: message,
      },
    });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
