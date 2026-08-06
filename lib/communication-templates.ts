import type { CommunicationChannel, CommunicationType } from '@/types/repair';

export type CommunicationTemplate = {
  id: string;
  label: string;
  tab: 'customer' | 'internal';
  channel: CommunicationChannel;
  type: CommunicationType;
  subject?: string;
  messageBody: string;
};

export const COMMUNICATION_TEMPLATE_CHANNELS: CommunicationChannel[] = ['WHATSAPP', 'EMAIL', 'PHONE', 'INTERNAL_NOTE'];

export const DEFAULT_COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
  {
    id: 'ready-for-pickup-whatsapp',
    label: 'Klaar voor ophalen (WhatsApp)',
    tab: 'customer',
    channel: 'WHATSAPP',
    type: 'CUSTOMER',
    subject: 'Machine klaar voor ophalen',
    messageBody: 'Uw machine staat klaar voor ophalen bij Sikma Werkplaats. Graag dit bericht meenemen bij afgifte.',
  },
  {
    id: 'waiting-for-parts-update',
    label: 'Wachten op onderdeel',
    tab: 'customer',
    channel: 'EMAIL',
    type: 'CUSTOMER',
    subject: 'Update reparatie: onderdeel in bestelling',
    messageBody: 'We wachten momenteel op een onderdeel. Zodra het onderdeel binnen is, nemen we direct contact met u op.',
  },
  {
    id: 'internal-diagnosis-note',
    label: 'Interne diagnose notitie',
    tab: 'internal',
    channel: 'INTERNAL_NOTE',
    type: 'INTERNAL',
    messageBody: 'Diagnose uitgevoerd. Vervolgactie en benodigde onderdelen hieronder noteren.',
  },
];

export const COMMUNICATION_TEMPLATES = DEFAULT_COMMUNICATION_TEMPLATES;

function normalizeTab(value: unknown): 'customer' | 'internal' {
  return value === 'internal' ? 'internal' : 'customer';
}

function normalizeChannel(value: unknown, fallback: CommunicationChannel): CommunicationChannel {
  if (typeof value !== 'string') return fallback;
  return (COMMUNICATION_TEMPLATE_CHANNELS.includes(value as CommunicationChannel)
    ? (value as CommunicationChannel)
    : fallback);
}

function normalizeType(value: unknown, fallback: CommunicationType): CommunicationType {
  if (typeof value !== 'string') return fallback;
  return value as CommunicationType;
}

export function normalizeCommunicationTemplates(value: unknown): CommunicationTemplate[] {
  if (!Array.isArray(value)) {
    return DEFAULT_COMMUNICATION_TEMPLATES;
  }

  const normalized = value.reduce<CommunicationTemplate[]>((accumulator, entry, index) => {
      const raw = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
      if (!raw) return accumulator;

      const tab = normalizeTab(raw.tab);
      const fallbackTemplate = DEFAULT_COMMUNICATION_TEMPLATES[index] ?? DEFAULT_COMMUNICATION_TEMPLATES[0];
      const fallbackChannel = tab === 'internal' ? 'INTERNAL_NOTE' : 'WHATSAPP';
      const fallbackType = tab === 'internal' ? 'INTERNAL' : 'CUSTOMER';

      const id = typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim()
        : `${fallbackTemplate.id}-${index + 1}`;
      const label = typeof raw.label === 'string' && raw.label.trim()
        ? raw.label.trim()
        : fallbackTemplate.label;
      const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
      const messageBody = typeof raw.messageBody === 'string' && raw.messageBody.trim()
        ? raw.messageBody.trim()
        : fallbackTemplate.messageBody;

      accumulator.push({
        id,
        label,
        tab,
        channel: normalizeChannel(raw.channel, fallbackChannel),
        type: normalizeType(raw.type, fallbackType),
        subject: subject || undefined,
        messageBody,
      });

      return accumulator;
    }, []);

  return normalized.length ? normalized : DEFAULT_COMMUNICATION_TEMPLATES;
}
