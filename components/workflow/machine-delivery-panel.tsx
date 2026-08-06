'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import { completeMachineDelivery, loadRepairCommunication } from '@/lib/repair-service';
import type { CommunicationEvent, PaymentMethod, Repair } from '@/types/repair';

type MachineDeliveryPanelProps = {
  repair: Repair;
  expandLabel?: string;
  onDelivered?: (updatedRepair: Repair) => void | Promise<void>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['Pin', 'Contant', 'Anders'];

function formatCurrency(value: number) {
  return `EUR ${value.toFixed(2).replace('.', ',')}`;
}

export function MachineDeliveryPanel({
  repair,
  expandLabel = 'Machine afgeven',
  onDelivered,
  isOpen: isOpenProp,
  onOpenChange,
}: MachineDeliveryPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'Open' | 'Betaald'>(repair.paymentStatus === 'Betaald' ? 'Betaald' : 'Open');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(repair.paymentMethod ?? 'Pin');
  const [counterNote, setCounterNote] = useState(repair.counterNote ?? '');
  const [maintenanceReminderOptIn, setMaintenanceReminderOptIn] = useState(false);
  const [communicationEvents, setCommunicationEvents] = useState<CommunicationEvent[]>([]);
  const [communicationLoading, setCommunicationLoading] = useState(false);

  const isControlled = typeof isOpenProp === 'boolean';
  const isOpen = isControlled ? Boolean(isOpenProp) : internalOpen;

  const setOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);
  };

  useEffect(() => {
    setInternalOpen(false);
    setIsSubmitting(false);
    setErrorMessage('');
    setPaymentStatus(repair.paymentStatus === 'Betaald' ? 'Betaald' : 'Open');
    setPaymentMethod(repair.paymentMethod ?? 'Pin');
    setCounterNote(repair.counterNote ?? '');
    setMaintenanceReminderOptIn(false);
  }, [repair.id, repair.paymentMethod, repair.paymentStatus, repair.counterNote]);

  useEffect(() => {
    let active = true;
    setCommunicationLoading(true);

    loadRepairCommunication([repair.id])
      .then((events) => {
        if (!active) return;
        setCommunicationEvents(events.slice(0, 4));
      })
      .catch(() => {
        if (!active) return;
        setCommunicationEvents([]);
      })
      .finally(() => {
        if (!active) return;
        setCommunicationLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repair.id]);

  const customerName = useMemo(() => {
    return repair.customer?.trim() || 'Onbekende klant';
  }, [repair.customer]);

  const machineName = useMemo(() => {
    const brand = repair.brand?.trim() || '-';
    const model = repair.model?.trim() || '-';
    return { brand, model };
  }, [repair.brand, repair.model]);

  const partsSummary = repair.partsUsed?.trim() || 'Geen onderdelen geregistreerd';
  const workshopNotes = repair.notes?.trim() || 'Geen werkplaatsnotitie geregistreerd';
  const repairWork = repair.repair?.trim() || 'Geen werkzaamheden geregistreerd';
  const technicianName = repair.assignedTo?.trim() || 'Niet vastgelegd';
  const customerPhone = repair.phone?.trim() || '';
  const customerEmail = repair.email?.trim() || '';
  const whatsappLink = customerPhone ? `https://wa.me/${customerPhone.replace(/\D/g, '')}` : '';

  function channelLabel(event: CommunicationEvent) {
    if (event.channel === 'WHATSAPP') return 'WhatsApp';
    if (event.channel === 'PHONE') return 'Telefoon';
    if (event.channel === 'EMAIL') return 'E-mail';
    if (event.channel === 'ONLINE_FORM') return 'Online formulier';
    if (event.channel === 'INTERNAL_NOTE') return 'Interne notitie';
    return event.channel;
  }

  async function handleDeliver() {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const updatedRepair = await completeMachineDelivery({
        repairId: repair.id,
        paymentStatus,
        paymentMethod: paymentStatus === 'Betaald' ? paymentMethod : undefined,
        counterNote,
        maintenanceReminderOptIn,
      });

      await onDelivered?.(updatedRepair);
      setOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Machine kon niet worden afgegeven.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-0">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-[#111111]">{customerName}</p>
            <p className="mt-1 text-sm text-slate-600">{repair.city || '-'}</p>
          </div>
          <StatusBadge status={repair.status} />
        </div>

        <div className="grid gap-2 rounded-[16px] bg-[#F8F8F8] p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p><span className="font-semibold text-slate-800">Merk:</span> {machineName.brand}</p>
          <p><span className="font-semibold text-slate-800">Type:</span> {machineName.model}</p>
          <p><span className="font-semibold text-slate-800">Reparatienummer:</span> {getDisplayRepairNumber(repair)}</p>
          <p><span className="font-semibold text-slate-800">Prijs:</span> {formatCurrency(repair.price ?? 0)}</p>
        </div>

        <div className="rounded-[16px] border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Communicatie</p>
              <p className="mt-1 text-sm font-semibold text-[#111111]">{communicationEvents.length ? `${communicationEvents.length} recente berichten` : 'Nog geen communicatie geregistreerd'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {customerPhone ? (
                <a href={`tel:${customerPhone}`} className="rounded-[10px] border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#111111] transition hover:border-slate-400">Bellen</a>
              ) : null}
              {whatsappLink ? (
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="rounded-[10px] border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#111111] transition hover:border-slate-400">WhatsApp</a>
              ) : null}
              {customerEmail ? (
                <a href={`mailto:${customerEmail}`} className="rounded-[10px] border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#111111] transition hover:border-slate-400">E-mail</a>
              ) : null}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {communicationLoading ? <p className="text-sm text-slate-500">Communicatie laden...</p> : null}
            {!communicationLoading && !communicationEvents.length ? <p className="text-sm text-slate-500">Geen communicatiegeschiedenis beschikbaar.</p> : null}
            {communicationEvents.map((event) => (
              <div key={event.id} className="rounded-[12px] bg-[#F8F8F8] px-3 py-2 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#111111]">{channelLabel(event)}</p>
                  <p className="text-xs text-slate-500">{event.occurredAt ? new Date(event.occurredAt).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                </div>
                {event.subject ? <p className="mt-1 text-xs text-slate-600">{event.subject}</p> : null}
              </div>
            ))}
          </div>
        </div>

        {!isOpen ? (
          <Button type="button" variant="primary" onClick={() => setOpen(true)}>
            {expandLabel}
          </Button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="border-t border-slate-200 bg-white px-5 pb-5 pt-4">
          <div className="space-y-4">
            <div className="rounded-[16px] bg-[#F8F8F8] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Klant</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p><span className="font-semibold text-[#111111]">Naam:</span> {customerName}</p>
                <p><span className="font-semibold text-[#111111]">Woonplaats:</span> {repair.city || '-'}</p>
                <p><span className="font-semibold text-[#111111]">Telefoon:</span> {repair.phone || '-'}</p>
                <p><span className="font-semibold text-[#111111]">E-mailadres:</span> {repair.email || '-'}</p>
              </div>
            </div>

            <div className="rounded-[16px] bg-[#F8F8F8] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Machine</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p><span className="font-semibold text-[#111111]">Merk:</span> {machineName.brand}</p>
                <p><span className="font-semibold text-[#111111]">Type:</span> {machineName.model}</p>
                <p><span className="font-semibold text-[#111111]">Reparatienummer:</span> {getDisplayRepairNumber(repair)}</p>
                <p><span className="font-semibold text-[#111111]">Status:</span> {repair.status}</p>
                <p className="sm:col-span-2"><span className="font-semibold text-[#111111]">Prijs:</span> {formatCurrency(repair.price ?? 0)}</p>
              </div>
            </div>

            <div className="rounded-[16px] bg-[#F8F8F8] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Werkplaats</p>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <p><span className="font-semibold text-[#111111]">Uitgevoerde werkzaamheden:</span> {repairWork}</p>
                <p><span className="font-semibold text-[#111111]">Werkplaatsnotitie:</span> {workshopNotes}</p>
                <p><span className="font-semibold text-[#111111]">Eventuele vervangen onderdelen:</span> {partsSummary}</p>
                <p><span className="font-semibold text-[#111111]">Naam reparateur:</span> {technicianName}</p>
              </div>
            </div>

            <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <h3 className="text-base font-semibold text-amber-950">Gratis onderhoudsservice</h3>
              <p className="mt-2 leading-6">
                Veel klanten vinden het prettig om een gratis onderhoudsherinnering te ontvangen.
              </p>
              <p className="mt-2 leading-6">
                Vraag daarom aan de klant: "Zullen wij u over ongeveer een jaar even een herinnering sturen wanneer uw machine waarschijnlijk weer aan onderhoud toe is?"
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-start gap-2 font-semibold text-amber-950">
                <input
                  type="checkbox"
                  checked={maintenanceReminderOptIn}
                  onChange={(event) => setMaintenanceReminderOptIn(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                Klant heeft mondeling ingestemd met het ontvangen van een gratis onderhoudsherinnering.
              </label>
            </div>

            <div className="rounded-[16px] bg-[#F8F8F8] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Betaling</p>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[#111111]">
                  Betaalstatus
                  <select
                    value={paymentStatus}
                    onChange={(event) => setPaymentStatus(event.target.value as 'Open' | 'Betaald')}
                    className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    <option value="Open">Open</option>
                    <option value="Betaald">Betaald</option>
                  </select>
                </label>

                <label className="text-sm font-semibold text-[#111111]">
                  Betaalmethode
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                    disabled={paymentStatus !== 'Betaald'}
                    className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block text-sm font-semibold text-[#111111]">
                Interne balienotitie (optioneel)
                <textarea
                  value={counterNote}
                  onChange={(event) => setCounterNote(event.target.value.slice(0, 250))}
                  rows={3}
                  placeholder="Maximaal 250 tekens"
                  className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <p className="mt-1 text-right text-xs text-slate-500">{counterNote.length}/250</p>
            </div>

            {errorMessage ? (
              <p className="rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Annuleren
              </Button>
              <Button type="button" variant="primary" onClick={handleDeliver} disabled={isSubmitting}>
                {isSubmitting ? 'Bezig met afgeven...' : 'Machine afgeven'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
