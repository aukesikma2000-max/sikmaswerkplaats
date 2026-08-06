import { Resend } from 'resend';

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} ontbreekt in environment variables.`);
  }
  return value;
}

function resolveReplyTo() {
  const value = process.env.RESEND_REPLY_TO?.trim();
  return value || undefined;
}

export async function sendWorkshopEmail(input: {
  to: string;
  subject: string;
  messageBody: string;
  repairId?: string;
}) {
  const apiKey = requireEnv('RESEND_API_KEY');
  const from = requireEnv('RESEND_FROM');
  const replyTo = resolveReplyTo();

  const resend = new Resend(apiKey);

  const plainText = input.messageBody.trim();
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <p>${plainText.replace(/\n/g, '<br/>')}</p>
      ${input.repairId ? `<p style="margin-top: 16px; color: #666; font-size: 12px;">Referentie: ${input.repairId}</p>` : ''}
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    text: plainText,
    html: htmlBody,
    replyTo,
  });

  if (error) {
    throw new Error(error.message || 'Resend verzending mislukt.');
  }

  return {
    messageId: data?.id,
  };
}
