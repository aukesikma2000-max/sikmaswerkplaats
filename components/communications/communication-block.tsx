'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DEFAULT_COMMUNICATION_TEMPLATES, type CommunicationTemplate } from '@/lib/communication-templates';
import { getActorHeaders } from '@/lib/client/request-actor';
import { addCommunicationEvent, loadCustomerCommunication, loadRepairCommunication } from '@/lib/repair-service';
import type { CommunicationChannel, CommunicationEvent, CommunicationType } from '@/types/repair';

type CommunicationBlockProps = {
  customerId?: string;
  repairId?: string;
  customerName?: string;
  repairNumber?: string;
  title?: string;
  showComposer?: boolean;
  defaultTab?: 'customer' | 'internal';
};

const CHANNEL_OPTIONS: Array<{ value: CommunicationChannel; label: string }> = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'PHONE', label: 'Telefoon' },
  { value: 'EMAIL', label: 'E-mail' },
];

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function formatDateTime(value?: string) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function channelIcon(channel: CommunicationChannel) {
  switch (channel) {
    case 'WHATSAPP': return '🟢';
    case 'PHONE': return '📞';
    case 'EMAIL': return '✉️';
    case 'ONLINE_FORM': return '🌐';
    case 'INTERNAL_NOTE': return '📝';
    default: return '○';
  }
}

function isInternal(channel: CommunicationChannel, type?: CommunicationType) {
  return channel === 'INTERNAL_NOTE' || type === 'INTERNAL';
}

export function CommunicationBlock({
  customerId,
  repairId,
  customerName,
  repairNumber,
  title = 'COMMUNICATIE',
  showComposer = true,
  defaultTab = 'customer',
}: CommunicationBlockProps) {
  const [activeTab, setActiveTab] = useState<'customer' | 'internal'>(defaultTab);
  const [events, setEvents] = useState<CommunicationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channel, setChannel] = useState<CommunicationChannel>('WHATSAPP');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templates, setTemplates] = useState<CommunicationTemplate[]>(DEFAULT_COMMUNICATION_TEMPLATES);
  const [customerApprovalChecked, setCustomerApprovalChecked] = useState(false);
  const [composerError, setComposerError] = useState('');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const loaded = customerId
        ? await loadCustomerCommunication(customerId)
        : repairId
          ? await loadRepairCommunication([repairId])
          : [];
      if (!active) return;
      setEvents(loaded);
      setLoading(false);
    }

    load().catch(() => {
      if (!active) return;
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [customerId, repairId]);

  useEffect(() => {
    let active = true;

    async function loadTemplates() {
      try {
        const response = await fetch('/api/settings/communication-templates', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({ ok: false }));

        if (!response.ok || payload?.ok !== true || !Array.isArray(payload?.templates)) {
          throw new Error('Kon templates niet laden.');
        }

        if (!active) return;
        setTemplates(payload.templates as CommunicationTemplate[]);
      } catch {
        if (!active) return;
        setTemplates(DEFAULT_COMMUNICATION_TEMPLATES);
      }
    }

    loadTemplates().catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((left, right) => (parseDate(right.occurredAt)?.getTime() ?? 0) - (parseDate(left.occurredAt)?.getTime() ?? 0));
  }, [events]);

  const customerEvents = useMemo(() => sortedEvents.filter((event) => !isInternal(event.channel, event.type)), [sortedEvents]);
  const internalEvents = useMemo(() => sortedEvents.filter((event) => isInternal(event.channel, event.type)), [sortedEvents]);
  const filteredEvents = useMemo(() => {
    const baseEvents = activeTab === 'customer' ? customerEvents : internalEvents;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return baseEvents;

    return baseEvents.filter((event) => {
      const haystack = [event.subject, event.messageBody, event.actorName, event.channel, event.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeTab, customerEvents, internalEvents, searchQuery]);

  const visibleTemplates = useMemo(() => {
    return templates.filter((template) => template.tab === activeTab);
  }, [activeTab, templates]);

  async function handleAddCommunication() {
    if (!customerId && !repairId) return;
    setComposerError('');

    const isInternalMessage = activeTab === 'internal';
    if (!isInternalMessage && !customerApprovalChecked) {
      setComposerError('Handmatige akkoord is verplicht voor klantcommunicatie.');
      return;
    }

    if (!isInternalMessage) {
      const confirmed = window.confirm('Handmatige akkoord: weet je zeker dat dit klantbericht nu verzonden of gelogd mag worden?');
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      let created: CommunicationEvent;

      if (!isInternalMessage && channel === 'EMAIL') {
        if (!customerId) {
          throw new Error('Klant-ID ontbreekt voor e-mailverzending.');
        }

        const response = await fetch('/api/communications/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getActorHeaders(),
          },
          body: JSON.stringify({
            customerId,
            repairId,
            subject: subject.trim(),
            messageBody: messageBody.trim(),
            manualApproval: true,
          }),
        });
        const payload = await response.json().catch(() => ({ ok: false }));
        if (!response.ok || payload?.ok !== true || !payload?.communication) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'E-mailverzending mislukt.');
        }
        created = payload.communication as CommunicationEvent;
      } else {
        created = await addCommunicationEvent({
          customerId,
          repairId,
          channel: isInternalMessage ? 'INTERNAL_NOTE' : channel,
          type: isInternalMessage ? 'INTERNAL' : 'CUSTOMER',
          actorName: 'Balie',
          subject: isInternalMessage ? undefined : subject.trim() || undefined,
          messageBody: messageBody.trim() || undefined,
          status: 'LOGGED',
          isAutomatic: false,
          metadata: !isInternalMessage ? { requiresManualDeliveryOutsideApp: true } : undefined,
        });
      }

      setEvents((current) => [created, ...current]);
      setSubject('');
      setMessageBody('');
      setChannel('WHATSAPP');
      setCustomerApprovalChecked(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Opslaan of verzenden mislukt.';
      setComposerError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">{title}</p>
          {repairNumber || customerName ? (
            <p className="mt-1 text-sm text-slate-600">
              {repairNumber ? `Reparatie ${repairNumber}` : ''}
              {repairNumber && customerName ? ' · ' : ''}
              {customerName ?? ''}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setActiveTab('customer')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'customer' ? 'bg-[#111111] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Klantcommunicatie
          </button>
          <button type="button" onClick={() => setActiveTab('internal')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'internal' ? 'bg-[#111111] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Interne notities
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-[14px] border border-slate-200 bg-slate-50 p-3">
        <label className="text-sm font-semibold text-[#111111]">
          Zoek in communicatie
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Onderwerp, kanaal, status of tekst"
            className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-slate-500">Communicatie laden...</p> : null}
        {!loading && !filteredEvents.length ? <p className="text-sm text-slate-500">Nog geen communicatie gevonden.</p> : null}

        {filteredEvents.map((event) => (
          <div key={event.id} className="rounded-[14px] border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111111]">{formatDateTime(event.occurredAt)}</p>
                <p className="mt-1 text-sm text-slate-600">{channelIcon(event.channel)} {event.channel}</p>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {event.isAutomatic ? 'Automatisch' : 'Handmatig'}
              </p>
            </div>
            {event.subject ? <p className="mt-3 text-sm font-semibold text-[#111111]">{event.subject}</p> : null}
            {event.actorName ? <p className="mt-1 text-xs text-slate-500">Medewerker: {event.actorName}</p> : null}
            {event.messageBody ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{event.messageBody}</p> : null}
            {event.status ? <p className="mt-2 text-xs text-slate-500">Status: {event.status}</p> : null}
            {event.errorMessage ? <p className="mt-2 rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{event.errorMessage}</p> : null}
          </div>
        ))}
      </div>

      {showComposer ? (
        <div className="mt-5 rounded-[16px] bg-[#F8F8F8] p-4">
          <p className="text-sm font-semibold text-[#111111]">+ Nieuw contactmoment</p>
          <div className="mt-3 space-y-3">
            {activeTab === 'customer' ? (
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setChannel(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${channel === option.value ? 'bg-[#111111] text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            {visibleTemplates.length ? (
              <label className="text-sm font-semibold text-[#111111]">
                Template
                <select
                  value={selectedTemplateId}
                  onChange={(event) => {
                    const templateId = event.target.value;
                    setSelectedTemplateId(templateId);
                    const template = visibleTemplates.find((item) => item.id === templateId);
                    if (!template) return;

                    setChannel(template.channel);
                    setSubject(template.subject ?? '');
                    setMessageBody(template.messageBody);
                  }}
                  className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Kies een template (optioneel)</option>
                  {visibleTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.label}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {activeTab === 'customer' ? (
              <label className="text-sm font-semibold text-[#111111]">
                Onderwerp
                <input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Optioneel" />
              </label>
            ) : null}

            <label className="block text-sm font-semibold text-[#111111]">
              Bericht
              <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={4} className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm" placeholder={activeTab === 'internal' ? 'Interne notitie' : 'Typ hier het bericht'} />
            </label>

            {activeTab === 'customer' ? (
              <label className="flex items-start gap-2 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={customerApprovalChecked}
                  onChange={(event) => setCustomerApprovalChecked(event.target.checked)}
                  className="mt-1"
                />
                <span>Ik geef handmatig akkoord om dit klantbericht te verzenden of als verzonden vast te leggen.</span>
              </label>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleAddCommunication}
              disabled={saving || (!messageBody.trim() && !subject.trim()) || (activeTab === 'customer' && !customerApprovalChecked)}
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
            {composerError ? <p className="text-xs text-rose-700">{composerError}</p> : null}
            <p className="text-xs text-slate-500">
              {activeTab === 'internal'
                ? 'Interne notitie wordt direct opgeslagen in de centrale communicatietabel.'
                : 'Klantcommunicatie vereist altijd handmatig akkoord en wordt daarna opgeslagen in de centrale communicatietabel.'}
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
