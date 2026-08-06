'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CustomerEditorModal } from '@/components/customers/customer-editor-modal';
import { CommunicationBlock } from '@/components/communications/communication-block';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import {
  ensureRepairInProgress,
  getGroupReadyCommunicationDraft,
  linkRepairs,
  loadCustomerCommunication,
  loadCustomerById,
  loadCustomerRepairs,
  loadRepairNotes,
  saveRepairMachineDetails,
  saveWorkshopOutcome,
  unlinkRepairFromGroup,
} from '@/lib/repair-service';
import {
  formatOutcomeLabel,
  formatStatusLabel,
  getOutcomeBadgeClass,
  getStatusAccentClass,
  getStatusBadgeClass,
} from '@/lib/workflow';
import type { Customer, Repair } from '@/types/repair';

type WorkshopOutcomeForm =
  | 'REPAIRED'
  | 'MAINTENANCE_DONE'
  | 'WARRANTY'
  | 'CALL_CUSTOMER'
  | 'PARTS_NEEDED'
  | 'NOT_REPAIRABLE';

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:,\s*(\d{1,2}):(\d{2}))?$/);
  if (!match) return null;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  return new Date(year, Number(match[2]) - 1, Number(match[1]), hour, minute);
}

function dateLabel(value?: string) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('nl-NL') : '-';
}

function datetimeLabel(value?: string) {
  const d = toDate(value);
  return d ? d.toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
}

function SectionLabel({ label }: { label: string }) {
  return <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">{label}</p>;
}

export default function WerkplaatsDossierPage() {
  const params = useParams<{ id: string }>();
  const repairId = decodeURIComponent(params?.id ?? '');

  const [repair, setRepair] = useState<Repair | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [relatedRepairs, setRelatedRepairs] = useState<Repair[]>([]);
  const [repairNotes, setRepairNotes] = useState<Array<{ id: string; note: string; createdAt: string; createdBy?: string }>>([]);
  const [customerCommunications, setCustomerCommunications] = useState<Array<{ id: string; occurredAt: string; channel: string; subject?: string; messageBody?: string; actorName?: string; status?: string; isAutomatic?: boolean }>>([]);
  const [linkSelection, setLinkSelection] = useState<string[]>([]);
  const [groupDraft, setGroupDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [machineForm, setMachineForm] = useState({ brand: '', model: '', serialNumber: '' });
  const [machineDirty, setMachineDirty] = useState(false);
  const [savingMachine, setSavingMachine] = useState(false);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [price, setPrice] = useState('');
  const [showPartsFields, setShowPartsFields] = useState(false);
  const [partsExpectedDate, setPartsExpectedDate] = useState('');
  const [partsRemark, setPartsRemark] = useState('');
  const [showNotRepairableOptions, setShowNotRepairableOptions] = useState(false);

  async function refresh(id: string) {
    const loaded = await ensureRepairInProgress(id);
    if (!loaded) {
      setRepair(null); setCustomer(null); setRelatedRepairs([]); setRepairNotes([]); setCustomerCommunications([]); setGroupDraft(null);
      return;
    }
    setRepair(loaded);
    setMachineForm({ brand: loaded.brand ?? '', model: loaded.model ?? '', serialNumber: loaded.serialNumber ?? '' });
    setMachineDirty(false);
    setTechnicianNotes(loaded.notes ?? '');
    setPrice(String(loaded.price > 0 ? loaded.price : ''));
    setShowPartsFields(loaded.status === 'WAITING_FOR_PARTS');
    setPartsExpectedDate(loaded.expectedDeliveryDate ?? '');
    setPartsRemark('');
    setShowNotRepairableOptions(false);
    const proms: Promise<unknown>[] = [];
    if (loaded.customerId) {
      proms.push(loadCustomerById(loaded.customerId).then(setCustomer));
      proms.push(loadCustomerRepairs(loaded.customerId).then((repairs) => setRelatedRepairs(repairs.filter((entry) => entry.id !== loaded.id))));
      proms.push(loadCustomerCommunication(loaded.customerId).then(setCustomerCommunications));
    } else {
      setCustomer(null); setRelatedRepairs([]); setCustomerCommunications([]);
    }
    proms.push(loadRepairNotes(loaded.id).then(setRepairNotes));
    proms.push(getGroupReadyCommunicationDraft(loaded.id).then(setGroupDraft));
    await Promise.all(proms);
  }

  useEffect(() => {
    if (!repairId) return;
    let active = true;
    setLoading(true);
    refresh(repairId)
      .catch((err) => { if (!active) return; setErrorMessage(err instanceof Error ? err.message : 'Laden mislukt.'); })
      .finally(() => { if (!active) return; setLoading(false); });
    return () => { active = false; };
  }, [repairId]);

  const timelineEntries = useMemo(() => {
    if (!repair) return [];

    const repairHistory = repair.history.map((entry) => ({
      kind: 'status' as const,
      timestamp: entry.timestamp,
      icon: '🧭',
      title: entry.user ? `${formatStatusLabel(entry.status)} door ${entry.user}` : formatStatusLabel(entry.status),
      note: entry.note,
      actorName: entry.user,
    }));

    const noteEntries = repairNotes.map((note) => ({
      kind: 'note' as const,
      timestamp: note.createdAt,
      icon: '📝',
      title: 'Werkplaatsnotitie bijgewerkt',
      note: note.note,
      actorName: note.createdBy,
    }));

    const communicationEntries = customerCommunications.map((event) => ({
      kind: 'communication' as const,
      timestamp: event.occurredAt,
      icon: event.channel === 'WHATSAPP' ? '📱' : event.channel === 'PHONE' ? '📞' : event.channel === 'EMAIL' ? '📧' : '✉️',
      title: `${event.channel === 'WHATSAPP' ? 'WhatsApp' : event.channel === 'PHONE' ? 'Telefoon' : event.channel === 'EMAIL' ? 'E-mail' : event.channel} verzonden`,
      note: event.subject || event.messageBody,
      actorName: event.actorName,
    }));

    return [...repairHistory, ...noteEntries, ...communicationEntries].sort((left, right) => (toDate(left.timestamp)?.getTime() ?? 0) - (toDate(right.timestamp)?.getTime() ?? 0));
  }, [customerCommunications, repair, repairNotes]);

  async function handleSaveMachine() {
    if (!repair) return;
    setSavingMachine(true); setErrorMessage('');
    try { await saveRepairMachineDetails(repair.id, machineForm); await refresh(repair.id); setSuccessMessage('Machinegegevens opgeslagen.'); setMachineDirty(false); }
    catch (err) { setErrorMessage(err instanceof Error ? err.message : 'Opslaan mislukt.'); }
    finally { setSavingMachine(false); }
  }

  async function handleLinkRepairs() {
    if (!repair || !linkSelection.length) return;
    setSaving(true); setErrorMessage(''); setSuccessMessage('');
    try { await linkRepairs(repair.id, linkSelection); setLinkSelection([]); await refresh(repair.id); setSuccessMessage('Werkbonnen gekoppeld.'); }
    catch (err) { setErrorMessage(err instanceof Error ? err.message : 'Koppelen mislukt.'); }
    finally { setSaving(false); }
  }

  async function handleUnlink() {
    if (!repair) return;
    setSaving(true); setErrorMessage('');
    try { await unlinkRepairFromGroup(repair.id); await refresh(repair.id); setSuccessMessage('Koppeling ongedaan gemaakt.'); }
    catch (err) { setErrorMessage(err instanceof Error ? err.message : 'Ontkoppelen mislukt.'); }
    finally { setSaving(false); }
  }

  async function handleOutcome(outcome: WorkshopOutcomeForm, finalOutcome?: 'NEW_MACHINE_SOLD' | 'MACHINE_DISCARDED') {
    if (!repair) return;
    setSaving(true); setErrorMessage(''); setSuccessMessage('');
    try {
      await saveWorkshopOutcome({
        repairId: repair.id, outcome, technicianNotes,
        price: price ? Number(price.replace(',', '.')) : undefined,
        partsExpectedDate: showPartsFields ? (partsExpectedDate || undefined) : undefined,
        partsRemark: showPartsFields ? (partsRemark || undefined) : undefined,
        callReason: outcome === 'CALL_CUSTOMER' ? 'QUESTION' : undefined,
        finalNotRepairableOutcome: finalOutcome,
      });
      await refresh(repair.id);
      setSuccessMessage('Dossier opgeslagen.');
    } catch (err) { setErrorMessage(err instanceof Error ? err.message : 'Opslaan mislukt.'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <PageShell backgroundClassName="bg-[#F2F0EB]">
      <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Dossier laden...</p>
      </div>
    </PageShell>
  );

  if (!repair) return (
    <PageShell backgroundClassName="bg-[#F2F0EB]">
      <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Werkplaats</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Dossier niet gevonden</h1>
        <Link href="/werkplaats" className="mt-5 inline-flex rounded-[12px] border border-slate-300 px-4 py-2 text-sm font-semibold text-[#111111] hover:border-slate-400">
          Terug naar overzicht
        </Link>
      </div>
    </PageShell>
  );

  if (repair.status === 'VOORAANMELDING') return (
    <PageShell backgroundClassName="bg-[#F2F0EB]">
      <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Werkplaats</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Vooraanmelding nog niet ontvangen</h1>
        <p className="mt-2 text-sm text-slate-600">Deze aanvraag staat nog in de online aanmeldingen en moet eerst aan de balie worden omgezet.</p>
        <Link href="/online-aanmeldingen" className="mt-5 inline-flex rounded-[12px] border border-slate-300 px-4 py-2 text-sm font-semibold text-[#111111] hover:border-slate-400">
          Naar online aanmeldingen
        </Link>
      </div>
    </PageShell>
  );

  const statusAccent = getStatusAccentClass(repair.status);
  const machineName = [repair.brand, repair.model].filter(Boolean).join(' ') || repair.machine || 'Machine onbekend';

  return (
    <PageShell backgroundClassName="bg-[#F2F0EB]">
      <div className="mx-auto max-w-[1380px] space-y-5">

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-5">
            <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <SectionLabel label="Omschrijving klant" />
              <p className="text-base leading-relaxed text-[#111111]">{repair.issue || <span className="italic text-slate-400">Geen omschrijving opgegeven.</span>}</p>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel label="Klantinformatie" />
                {customer ? (
                  <button type="button" onClick={() => setCustomerModalOpen(true)} className="mb-3 rounded-[10px] border border-slate-300 px-3 py-1 text-xs font-semibold text-[#111111] transition hover:border-slate-400">
                    Bewerk klant
                  </button>
                ) : null}
              </div>
              {customer ? (
                <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                  <div><span className="text-slate-400">Naam</span><p className="font-semibold text-[#111111]">{[customer.firstName, customer.lastName].filter(Boolean).join(' ')}</p></div>
                  <div><span className="text-slate-400">Woonplaats</span><p className="font-medium text-[#111111]">{customer.city || '-'}</p></div>
                  {(customer.mobilePhone || customer.phone) ? <div><span className="text-slate-400">Mobiel</span><p className="font-medium text-[#111111]">{customer.mobilePhone || customer.phone}</p></div> : null}
                  {customer.landlinePhone ? <div><span className="text-slate-400">Vast</span><p className="font-medium text-[#111111]">{customer.landlinePhone}</p></div> : null}
                  {customer.email ? <div className="sm:col-span-2"><span className="text-slate-400">E-mail</span><p className="font-medium text-[#111111]">{customer.email}</p></div> : null}
                  <div className="sm:col-span-2 mt-2 rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gratis onderhoudsservice</p>
                    <p className="mt-1 text-sm font-semibold text-[#111111]">{customer.maintenanceReminderOptIn ? 'Actief' : 'Niet actief'}</p>
                    {customer.maintenanceReminderOptIn ? <p className="text-xs text-slate-600">Volgende herinnering: {dateLabel(customer.nextMaintenanceReminderDate)}</p> : null}
                    {customer.maintenanceConsentDate ? <p className="text-xs text-slate-500">Consent: {datetimeLabel(customer.maintenanceConsentDate)} via {customer.maintenanceConsentMethod || 'onbekend'}</p> : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{repair.customer} &middot; {repair.phone}{repair.city ? ` · ${repair.city}` : ''}</p>
              )}
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <SectionLabel label="Machine identificeren" />
              <p className="mb-4 text-xs text-slate-500">De reparateur vult merk, model en serienummer in zodra de machine voor hem ligt.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  { field: 'brand' as const, label: 'Merk', placeholder: 'Bijv. Bernina' },
                  { field: 'model' as const, label: 'Type', placeholder: 'Bijv. 570 QE' },
                  { field: 'serialNumber' as const, label: 'Serienummer', placeholder: 'Bijv. 12345678' },
                ]).map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor={`machine-${field}`}>{label}</label>
                    <input id={`machine-${field}`} value={machineForm[field]}
                      onChange={(e) => { setMachineForm((p) => ({ ...p, [field]: e.target.value })); setMachineDirty(true); }}
                      className="w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                      placeholder={placeholder} />
                  </div>
                ))}
              </div>
              {machineDirty ? (
                <button type="button" disabled={savingMachine} onClick={handleSaveMachine}
                  className="mt-4 rounded-[10px] bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40">
                  {savingMachine ? 'Opslaan...' : 'Machinegegevens opslaan'}
                </button>
              ) : null}
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <SectionLabel label="Werkplaatsnotitie" />
              <textarea value={technicianNotes} onChange={(e) => setTechnicianNotes(e.target.value)}
                className="min-h-[340px] w-full rounded-[10px] border border-slate-300 bg-white px-4 py-3 text-sm text-[#111111] placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                placeholder="Beschrijf de uitgevoerde werkzaamheden, bevindingen en bijzonderheden..." />
            </div>

            <CommunicationBlock
              customerId={repair.customerId}
              repairId={repair.id}
              customerName={customer?.name ?? repair.customer}
              repairNumber={repair.id}
              title="COMMUNICATIE"
              defaultTab="customer"
              showComposer
            />

            <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel label="Gerelateerde reparaties" />
                {relatedRepairs.length > 0 && !showLinkPanel && !repair.repairGroupId ? (
                  <button type="button" onClick={() => setShowLinkPanel(true)} className="mb-3 rounded-[10px] border border-slate-300 px-3 py-1 text-xs font-semibold text-[#111111] transition hover:border-slate-400">
                    + Koppel reparatie
                  </button>
                ) : null}
              </div>
              {repair.repairGroupId ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-[#D4AF37]">Gekoppeld aan groep</span>
                  <button type="button" disabled={saving} onClick={handleUnlink}
                    className="rounded-[10px] border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600">
                    Ontkoppel
                  </button>
                </div>
              ) : null}
              {relatedRepairs.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {relatedRepairs.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center gap-3 rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                      <span className="font-semibold text-[#111111]">{getDisplayRepairNumber(entry)}</span>
                      <span className="text-slate-500">{entry.machine || '-'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(entry.status)}`}>{formatStatusLabel(entry.status)}</span>
                      <Link href={`/werkplaats/${encodeURIComponent(entry.id)}`} className="ml-auto rounded-[10px] border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-[#111111] transition hover:border-slate-400">
                        Openen
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Nog geen gerelateerde reparaties.</p>
              )}

              {showLinkPanel ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-slate-500">Selecteer een reparatie om te koppelen:</p>
                  {relatedRepairs.filter((entry) => entry.status !== 'COMPLETED').map((entry) => (
                    <label key={entry.id} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300">
                      <input type="checkbox" checked={linkSelection.includes(entry.id)} onChange={() => setLinkSelection((c) => c.includes(entry.id) ? c.filter((x) => x !== entry.id) : [...c, entry.id])} className="h-4 w-4" />
                      <span className="font-semibold text-[#111111]">{getDisplayRepairNumber(entry)}</span>
                      <span className="text-sm text-slate-500">{entry.machine || '-'}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(entry.status)}`}>{formatStatusLabel(entry.status)}</span>
                    </label>
                  ))}
                  <div className="flex gap-3 pt-1">
                    <button type="button" disabled={!linkSelection.length || saving} onClick={handleLinkRepairs}
                      className="rounded-[10px] bg-[#111111] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-slate-800 transition">
                      Koppel selectie
                    </button>
                    <button type="button" onClick={() => setShowLinkPanel(false)}
                      className="rounded-[10px] border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400 transition">
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <SectionLabel label="Centrale tijdlijn" />
              {timelineEntries.length > 0 ? (
                <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                  {timelineEntries.map((entry, index) => (
                    <li key={`${entry.kind}-${entry.timestamp}-${index}`} className="relative">
                      <div className="absolute -left-[22px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-slate-400 text-[8px] text-white" />
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="text-sm">{entry.icon}</span>
                        <span className="text-sm font-semibold text-[#111111]">{entry.title}</span>
                        <span className="text-xs text-slate-400">{entry.timestamp}</span>
                        {entry.actorName ? <span className="text-xs text-slate-500">{entry.actorName}</span> : null}
                      </div>
                      {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-400">Nog geen tijdlijnitems beschikbaar.</p>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-6">
            <Card className="space-y-4 p-5 shadow-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Status</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(repair.status)}`}>{formatStatusLabel(repair.status)}</span>
                  {repair.repairOutcome ? <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getOutcomeBadgeClass(repair.repairOutcome)}`}>{formatOutcomeLabel(repair.repairOutcome)}</span> : null}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Prijs</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-lg font-semibold text-slate-400">&#8364;</span>
                  <input value={price} onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-[#111111] placeholder:text-slate-300 focus:border-slate-500 focus:outline-none"
                    placeholder="0,00" />
                </div>
              </div>

              <div className="space-y-2 rounded-[14px] bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Reparatie-uitkomst</p>
                <div className="grid gap-2">
                  <button type="button" disabled={saving} onClick={() => handleOutcome('REPAIRED')} className="rounded-[10px] bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40">Gerepareerd</button>
                  <button type="button" disabled={saving} onClick={() => handleOutcome('MAINTENANCE_DONE')} className="rounded-[10px] bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-40">Onderhoud uitgevoerd</button>
                  <button type="button" disabled={saving} onClick={() => handleOutcome('WARRANTY')} className="rounded-[10px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40">Garantie</button>
                  <button type="button" disabled={saving} onClick={() => handleOutcome('CALL_CUSTOMER')} className="rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-40">Wacht op klant</button>
                  <button type="button" disabled={saving} onClick={() => setShowPartsFields(true)} className="rounded-[10px] border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 disabled:opacity-40">Wacht op onderdelen</button>
                  <button type="button" disabled={saving} onClick={() => setShowNotRepairableOptions((current) => !current)} className="rounded-[10px] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-40">Niet repareerbaar</button>
                </div>

                {showPartsFields ? (
                  <div className="space-y-3 rounded-[12px] border border-violet-200 bg-white p-4">
                    <div className="grid gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Verwachte leverdatum</label>
                        <input value={partsExpectedDate} onChange={(e) => setPartsExpectedDate(e.target.value)} className="w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none" placeholder="dd-mm-jjjj" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Opmerking onderdelen</label>
                        <input value={partsRemark} onChange={(e) => setPartsRemark(e.target.value)} className="w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none" placeholder="Bijv. spoelhuis besteld" />
                      </div>
                    </div>
                    <button type="button" disabled={saving || (!partsExpectedDate && !partsRemark)} onClick={() => handleOutcome('PARTS_NEEDED')} className="rounded-[10px] bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-30">
                      {saving ? 'Opslaan...' : 'Opslaan — wacht op onderdelen'}
                    </button>
                  </div>
                ) : null}

                {showNotRepairableOptions ? (
                  <div className="space-y-2 rounded-[12px] border border-rose-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Niet repareerbaar</p>
                    <div className="grid gap-2">
                      <button type="button" disabled={saving} onClick={() => handleOutcome('NOT_REPAIRABLE', 'MACHINE_DISCARDED')} className="rounded-[10px] border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40">Machine afgevoerd</button>
                      <button type="button" disabled={saving} onClick={() => handleOutcome('NOT_REPAIRABLE', 'NEW_MACHINE_SOLD')} className="rounded-[10px] border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40">Nieuwe machine verkocht</button>
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="text-xs text-slate-500">De status kan altijd zonder scrollen worden aangepast.</p>
            </Card>
          </div>
        </div>

      </div>

      <CustomerEditorModal open={customerModalOpen} customer={customer} onClose={() => setCustomerModalOpen(false)}
        onSaved={(updated) => { setCustomer(updated); setCustomerModalOpen(false); setSuccessMessage('Klantgegevens bijgewerkt.'); }} />
    </PageShell>
  );
}
