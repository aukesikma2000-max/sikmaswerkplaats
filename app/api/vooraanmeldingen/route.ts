import { NextResponse, type NextRequest } from 'next/server';
import { addOnlineSubmission } from '@/lib/repair-service';

const WEBHOOK_SECRET = process.env.ONLINE_SUBMISSION_WEBHOOK_SECRET?.trim() || '';

function readString(source: FormData | Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source instanceof FormData ? source.get(key) : source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readOptionalString(source: FormData | Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source instanceof FormData ? source.get(key) : source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

async function readPayload(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return await request.json() as Record<string, unknown>;
  }

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    return formData;
  }

  return await request.json().catch(() => ({} as Record<string, unknown>));
}

export async function POST(request: NextRequest) {
  try {
    if (WEBHOOK_SECRET) {
      const providedSecret = request.headers.get('x-sikma-webhook-secret')?.trim() || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
      if (providedSecret !== WEBHOOK_SECRET) {
        return NextResponse.json({ ok: false, error: 'Ongeldige webhook authenticatie.' }, { status: 401 });
      }
    }

    const payload = await readPayload(request);
    const customer = readString(payload, ['customer', 'name', 'full_name', 'fullName']);
    const phone = readString(payload, ['phone', 'mobilePhone', 'mobile_phone', 'telephone']);
    const email = readOptionalString(payload, ['email', 'email_address']);
    const city = readOptionalString(payload, ['city', 'place']);
    const brand = readString(payload, ['brand', 'merk']);
    const model = readOptionalString(payload, ['model', 'type']);
    const machine = readOptionalString(payload, ['machine', 'machine_name']);
    const issue = readString(payload, ['issue', 'complaint', 'problem']);
    const notes = readOptionalString(payload, ['notes', 'note']);
    const address = readOptionalString(payload, ['address', 'street']);
    const websiteSubmissionId = readOptionalString(payload, ['websiteSubmissionId', 'website_submission_id', 'submissionId', 'submission_id']);
    const websiteSubmissionDate = readOptionalString(payload, ['websiteSubmissionDate', 'website_submission_date']);

    const missing: string[] = [];
    if (!customer) missing.push('customer');
    if (!phone) missing.push('phone');
    if (!brand) missing.push('brand');
    if (!issue) missing.push('issue');

    if (missing.length) {
      return NextResponse.json(
        { ok: false, error: 'Ontbrekende verplichte velden.', missing },
        { status: 400 },
      );
    }

    const repair = await addOnlineSubmission({
      customer,
      phone,
      email,
      city,
      brand,
      model,
      machine,
      issue,
      notes,
      address,
      websiteSubmissionId,
      websiteSubmissionDate,
    });

    return NextResponse.json(
      {
        ok: true,
        status: repair.status,
        repairId: repair.id,
        websiteSubmissionId: repair.websiteSubmissionId ?? websiteSubmissionId ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vooraanmelding kon niet worden aangemaakt.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, error: 'Gebruik POST om een vooraanmelding aan te maken.' }, { status: 405 });
}
