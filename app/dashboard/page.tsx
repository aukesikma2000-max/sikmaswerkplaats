'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { hasPermission } from '@/lib/access-control';
import { DEFAULT_WORKSHOP_USER, getActiveWorkshopUserRecord, type WorkshopUser } from '@/lib/active-user';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import { loadRepairChannelCommunication, loadRepairCommunication, loadRepairsByStatus } from '@/lib/repair-service';
import type { CommunicationChannel, CommunicationEvent, Repair } from '@/types/repair';

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function isToday(value?: string) {
  const date = toDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isOlderThan7Days(value?: string) {
  const date = toDate(value);
  if (!date) return false;
  return Date.now() - date.getTime() > 7 * 24 * 60 * 60 * 1000;
}

const COMMUNICATION_CHANNELS: Array<{ channel: CommunicationChannel; label: string; icon: string; mutedIcon: string }> = [
  { channel: 'PHONE', label: 'Telefonisch', icon: '📞', mutedIcon: '○' },
  { channel: 'WHATSAPP', label: 'WhatsApp', icon: '🟢', mutedIcon: '○' },
  { channel: 'EMAIL', label: 'E-mail', icon: '✉️', mutedIcon: '○' },
];

function parseDateTime(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const withTimeMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})$/);
  if (!withTimeMatch) return null;

  const year = Number(withTimeMatch[3].length === 2 ? `20${withTimeMatch[3]}` : withTimeMatch[3]);
  return new Date(year, Number(withTimeMatch[2]) - 1, Number(withTimeMatch[1]), Number(withTimeMatch[4]), Number(withTimeMatch[5]));
}

function formatDateTime(value?: string) {
  const date = parseDateTime(value);
  if (!date) return '-';
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getMachineLine(repair: Repair) {
  const brand = repair.brand?.trim() ?? '';
  const model = repair.model?.trim() ?? '';
  const combined = [brand, model].filter(Boolean).join(' ').trim();
  return combined || repair.machine || '-';
}

function buildFallbackCommunicationFromHistory(repair: Repair): CommunicationEvent[] {
  return repair.history
    .map((entry) => {
      const note = (entry.note ?? '').toLowerCase();
      let channel: CommunicationChannel | null = null;
      if (note.includes('whatsapp')) channel = 'WHATSAPP';
      else if (note.includes('telefon') || note.includes('gebeld')) channel = 'PHONE';
      else if (note.includes('e-mail') || note.includes('email') || note.includes('mail')) channel = 'EMAIL';

      if (!channel) return null;

      return {
        id: `history-${repair.id}-${entry.timestamp}-${channel}`,
        customerId: repair.customerId,
        repairId: repair.id,
        channel,
        occurredAt: entry.timestamp,
        actorName: entry.user,
        messageBody: entry.note,
        status: 'LOGGED',
      } as CommunicationEvent;
    })
    .filter((event): event is CommunicationEvent => Boolean(event));
}

function getRepairCommunicationEvents(repair: Repair, communicationByRepair: Record<string, CommunicationEvent[]>) {
  const centralEvents = communicationByRepair[repair.id] ?? [];
  if (centralEvents.length) return centralEvents;
  return buildFallbackCommunicationFromHistory(repair);
}

function getChannelEvents(events: CommunicationEvent[], channel: CommunicationChannel) {
  return events
    .filter((event) => event.channel === channel)
    .sort((left, right) => {
      const leftTime = parseDateTime(left.occurredAt)?.getTime() ?? 0;
      const rightTime = parseDateTime(right.occurredAt)?.getTime() ?? 0;
      return rightTime - leftTime;
    });
}

function formatCommunicationStatus(status?: string) {
  if (!status) return 'Gelogd';
  if (status === 'SENT') return 'Verzonden';
  if (status === 'DELIVERED') return 'Afgeleverd';
  if (status === 'READ') return 'Gelezen';
  if (status === 'FAILED') return 'Mislukt';
  return status;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);
  const [onlineSubmissions, setOnlineSubmissions] = useState<Repair[]>([]);
  const [newRepairs, setNewRepairs] = useState<Repair[]>([]);
  const [inWorkshop, setInWorkshop] = useState<Repair[]>([]);
  const [waitingForParts, setWaitingForParts] = useState<Repair[]>([]);
  const [waitingForCustomer, setWaitingForCustomer] = useState<Repair[]>([]);
  const [ready, setReady] = useState<Repair[]>([]);
  const [communicationByRepair, setCommunicationByRepair] = useState<Record<string, CommunicationEvent[]>>({});
  const [communicationDrawer, setCommunicationDrawer] = useState<{ repair: Repair; channel: CommunicationChannel } | null>(null);
  const [drawerEvents, setDrawerEvents] = useState<CommunicationEvent[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    const syncUser = () => setActiveUser(getActiveWorkshopUserRecord());
    syncUser();
    window.addEventListener('sikma-active-user-changed', syncUser as EventListener);
    window.addEventListener('sikma-users-changed', syncUser as EventListener);
    return () => {
      window.removeEventListener('sikma-active-user-changed', syncUser as EventListener);
      window.removeEventListener('sikma-users-changed', syncUser as EventListener);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const [onlineData, newData, workshopData, partsData, customerData, readyData] = await Promise.all([
        loadRepairsByStatus('VOORAANMELDING'),
        loadRepairsByStatus('NEW'),
        loadRepairsByStatus('IN_WORKSHOP'),
        loadRepairsByStatus('WAITING_FOR_PARTS'),
        loadRepairsByStatus('WAITING_FOR_CUSTOMER'),
        loadRepairsByStatus('READY'),
      ]);
      if (!active) return;
      setOnlineSubmissions(onlineData);
      setNewRepairs(newData);
      setInWorkshop(workshopData);
      setWaitingForParts(partsData);
      setWaitingForCustomer(customerData);
      setReady(readyData);

      const readyIds = readyData.map((entry) => entry.id);
      const communicationEvents = await loadRepairCommunication(readyIds);
      if (!active) return;

      const grouped = communicationEvents.reduce<Record<string, CommunicationEvent[]>>((accumulator, event) => {
        if (!event.repairId) return accumulator;
        if (!accumulator[event.repairId]) {
          accumulator[event.repairId] = [];
        }
        accumulator[event.repairId].push(event);
        return accumulator;
      }, {});

      setCommunicationByRepair(grouped);
    }

    load().catch(() => {
      if (!active) return;
    });

    const pollId = window.setInterval(() => {
      load().catch(() => {
        if (!active) return;
      });
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, []);

  const canUseWorkshop = hasPermission(activeUser.role, 'workshop.manage');
  const canCreateRepair = hasPermission(activeUser.role, 'repairs.create');
  const canManagePickup = hasPermission(activeUser.role, 'pickup.manage');
  const canUseOnlineSubmissions = hasPermission(activeUser.role, 'onlineSubmissions.view');
  const isFrontDesk = activeUser.role === 'Front Desk';

  // Klikdoel per rol: Werkplaats voor technicus/admin, Reparatieoverzicht voor balie
  const onlineSubmissionsLink = '/online-aanmeldingen';
  const inWorkshopLink = canUseWorkshop ? '/werkplaats' : '/reparaties?status=IN_WORKSHOP';
  const waitingLink = canUseWorkshop ? '/werkplaats' : '/reparaties?status=WAITING_FOR_PARTS';
  const readyLink = canUseWorkshop ? '/werkplaats' : '/reparaties?status=READY';

  const readyToday = useMemo(() => ready.filter((r) => isToday(r.readyAt ?? r.statusUpdatedAt)), [ready]);
  const readyOld = useMemo(() => ready.filter((r) => isOlderThan7Days(r.readyAt ?? r.statusUpdatedAt)), [ready]);
  const readyList = useMemo(() => ready.slice(0, 6), [ready]);
  const hasMoreReadyRepairs = ready.length > readyList.length;

  useEffect(() => {
    const currentDrawer = communicationDrawer;

    if (!currentDrawer) {
      setDrawerEvents([]);
      return;
    }

    const drawer = currentDrawer;

    let active = true;
    const fallbackEvents = getChannelEvents(
      getRepairCommunicationEvents(drawer.repair, communicationByRepair),
      drawer.channel,
    );

    async function loadDrawerEvents() {
      setDrawerLoading(true);
      try {
        const events = await loadRepairChannelCommunication(drawer.repair.id, drawer.channel);
        if (!active) return;
        setDrawerEvents(events.length ? events : fallbackEvents);
      } catch {
        if (!active) return;
        setDrawerEvents(fallbackEvents);
      } finally {
        if (active) {
          setDrawerLoading(false);
        }
      }
    }

    loadDrawerEvents();

    return () => {
      active = false;
    };
  }, [communicationByRepair, communicationDrawer]);

  return (
    <PageShell showSearch>
      <div className="space-y-6">

        {/* Actieknoppen — alleen voor rollen met die rechten */}
        <div className="grid gap-4 md:grid-cols-2">
          {canCreateRepair ? (
            <Link href="/nieuwe-reparatie" className="block">
              <Card className="h-full min-h-[190px] bg-gradient-to-r from-[#D4AF37] to-[#D19F00] p-7 text-white transition hover:shadow-[0_16px_36px_rgba(17,17,17,0.12)]">
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-5xl font-light text-[#D19F00]">+</div>
                  <div>
                    <h2 className="text-3xl font-semibold">Nieuwe reparatie</h2>
                    <p className="mt-1 text-base text-white/90">Meld een nieuwe machine aan</p>
                  </div>
                </div>
              </Card>
            </Link>
          ) : null}

          {canManagePickup ? (
            <Link href="/machine-ophalen" className="block">
              <Card className="h-full min-h-[190px] bg-gradient-to-r from-emerald-700 to-emerald-600 p-7 text-white transition hover:shadow-[0_16px_36px_rgba(17,17,17,0.12)]">
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl">📦</div>
                  <div>
                    <h2 className="text-3xl font-semibold">Machine afgeven</h2>
                    <p className="mt-1 text-base text-white/90">{ready.length} machine{ready.length !== 1 ? 's' : ''} klaar</p>
                  </div>
                </div>
              </Card>
            </Link>
          ) : null}
        </div>

        {/* Overzichtskaarten niet tonen voor balie */}
        {!isFrontDesk ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          {canUseOnlineSubmissions ? (
            <Link href={onlineSubmissionsLink} className="block">
              <Card className="h-full border border-amber-100 bg-gradient-to-b from-[#FFF9E8] to-white p-5 transition hover:shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-600">Online</p>
                <p className="mt-2 text-4xl font-bold text-[#111111]">{onlineSubmissions.length}</p>
                <div className="mt-4 space-y-1.5 border-t border-amber-100 pt-3 text-sm text-slate-600">
                  <div className="flex items-start justify-between gap-3">
                    <span className="max-w-[8rem] leading-snug">Nieuwe<br />reparatieaanvragen</span>
                    <span className="font-semibold text-[#111111]">{onlineSubmissions.length}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ) : null}

          {/* In werkplaats */}
          <Link href={inWorkshopLink} className="block">
            <Card className="h-full border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-5 transition hover:shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-600">In werkplaats</p>
              <p className="mt-2 text-4xl font-bold text-[#111111]">{newRepairs.length + inWorkshop.length}</p>
              <div className="mt-4 space-y-1.5 border-t border-sky-100 pt-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Nieuw</span>
                  <span className="font-semibold text-[#111111]">{newRepairs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>In behandeling</span>
                  <span className="font-semibold text-[#111111]">{inWorkshop.length}</span>
                </div>
              </div>
            </Card>
          </Link>

          {/* Wachten */}
          <Link href={waitingLink} className="block">
            <Card className="h-full border border-amber-100 bg-gradient-to-b from-amber-50 to-white p-5 transition hover:shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-600">Wachten</p>
              <p className="mt-2 text-4xl font-bold text-[#111111]">{waitingForParts.length + waitingForCustomer.length}</p>
              <div className="mt-4 space-y-1.5 border-t border-amber-100 pt-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Op onderdelen</span>
                  <span className="font-semibold text-[#111111]">{waitingForParts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Op klant</span>
                  <span className="font-semibold text-[#111111]">{waitingForCustomer.length}</span>
                </div>
              </div>
            </Card>
          </Link>

          {/* Klaar */}
          <Link href={readyLink} className="block">
            <Card className="h-full border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-5 transition hover:shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-600">Klaar voor klant</p>
              <p className="mt-2 text-4xl font-bold text-[#111111]">{ready.length}</p>
              <div className="mt-4 space-y-1.5 border-t border-emerald-100 pt-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Vandaag klaar</span>
                  <span className="font-semibold text-[#111111]">{readyToday.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className={readyOld.length > 0 ? 'text-rose-600' : ''}>
                    {readyOld.length > 0 ? '⚠ ' : ''}Langer dan 7 dagen
                  </span>
                  <span className={`font-semibold ${readyOld.length > 0 ? 'text-rose-600' : 'text-[#111111]'}`}>
                    {readyOld.length}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        </div>
        ) : null}

        {/* Klaar voor klant lijst */}
        <Card className="overflow-hidden p-0">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <h3 className="text-xl font-semibold text-[#111111]">Klaar voor klant</h3>
              <p className="mt-1 text-sm text-slate-500">Sneltoetsenpaneel voor directe doorgang naar het juiste afgiftedossier.</p>
            </div>
          </div>

          <div className="p-0">
            {readyList.map((repair) => {
              const events = getRepairCommunicationEvents(repair, communicationByRepair);

              return (
                <div
                  key={repair.id}
                  className="cursor-pointer border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50"
                  onClick={() => router.push(`/reparaties/${encodeURIComponent(repair.id)}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/reparaties/${encodeURIComponent(repair.id)}`);
                    }
                  }}
                >
                <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr_1.4fr_0.9fr_auto_auto] xl:items-start">
                  <div className="min-h-[56px]">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Reparatienummer</p>
                    <p className="mt-1 text-sm font-semibold text-[#111111]">{getDisplayRepairNumber(repair)}</p>
                  </div>

                  <div className="min-h-[56px]">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Klant</p>
                    <p className="mt-1 text-sm font-semibold text-[#111111]">{repair.customer}</p>
                    <p className="text-sm text-slate-600">{repair.city || '\u00A0'}</p>
                  </div>

                  <div className="min-h-[56px]">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Machine</p>
                    <p className="mt-1 text-sm font-semibold text-[#111111]">{getMachineLine(repair)}</p>
                    <p className="text-sm text-slate-600">\u00A0</p>
                  </div>

                  <div className="min-h-[56px]">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Communicatie</p>
                    <div className="mt-1 flex items-center gap-2">
                      {COMMUNICATION_CHANNELS.map((channel) => {
                        const hasChannelEvents = getChannelEvents(events, channel.channel).length > 0;
                        return hasChannelEvents ? (
                          <button
                            key={channel.channel}
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-base transition hover:border-[#D4AF37]"
                            title={`${channel.label} bekijken`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setCommunicationDrawer({ repair, channel: channel.channel });
                            }}
                          >
                            {channel.icon}
                          </button>
                        ) : (
                          <span
                            key={channel.channel}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-400"
                            title={`Geen ${channel.label.toLowerCase()} communicatie`}
                          >
                            {channel.mutedIcon}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-h-[56px]">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status</p>
                    <div className="mt-1 flex items-center">
                      <StatusBadge status="READY" />
                    </div>
                  </div>

                  <div className="min-h-[56px]">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Actie</p>
                    {repair.price > 0 ? <p className="mb-2 mt-1 text-sm font-semibold text-[#111111]">€ {repair.price.toFixed(2)}</p> : <p className="mb-2 mt-1 text-sm text-slate-500">\u00A0</p>}
                    <Link
                      href={`/reparaties/${encodeURIComponent(repair.id)}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center rounded-[12px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111111] transition hover:border-[#D4AF37]"
                    >
                      Dossier openen →
                    </Link>
                  </div>
                </div>
                </div>
              );
            })}

            {!readyList.length ? (
              <div className="px-5 py-6 text-sm text-slate-500">
                Er staan momenteel geen machines klaar om af te geven.
              </div>
            ) : null}

            {hasMoreReadyRepairs ? (
              <div className="border-t border-slate-100 px-5 py-4 text-center text-sm text-slate-500">
                <Link href="/machine-ophalen" className="font-semibold text-[#111111] hover:underline">
                  Bekijk alle {ready.length} klaar-voor-klant machines →
                </Link>
              </div>
            ) : null}
          </div>
        </Card>

        {communicationDrawer ? (
          <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-[#111111]/35" onClick={() => setCommunicationDrawer(null)}>
            <div
              className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-[0_20px_60px_rgba(17,17,17,0.3)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Communicatie</p>
                    <h4 className="mt-1 text-lg font-semibold text-[#111111]">
                      {COMMUNICATION_CHANNELS.find((entry) => entry.channel === communicationDrawer.channel)?.label ?? communicationDrawer.channel}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {getDisplayRepairNumber(communicationDrawer.repair)} · {communicationDrawer.repair.customer}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-xl text-slate-600 transition hover:border-[#D4AF37]"
                    onClick={() => setCommunicationDrawer(null)}
                    aria-label="Sluiten"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-5">
                {drawerLoading ? <p className="text-sm text-slate-500">Communicatiehistorie laden...</p> : null}

                {!drawerLoading && !drawerEvents.length ? (
                  <p className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Nog geen communicatie gevonden voor dit kanaal.
                  </p>
                ) : null}

                {drawerEvents.map((event) => (
                  <div key={event.id} className="rounded-[14px] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-[#111111]">{formatDateTime(event.occurredAt)}</p>

                    {event.actorName ? (
                      <p className="mt-1 text-sm text-slate-600">Medewerker: {event.actorName}</p>
                    ) : null}

                    <p className="mt-1 text-sm text-slate-600">Status: {formatCommunicationStatus(event.status)}</p>

                    {event.subject ? (
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-semibold text-[#111111]">Onderwerp:</span> {event.subject}
                      </p>
                    ) : null}

                    {event.messageBody ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {communicationDrawer.channel === 'PHONE' ? (
                          <span className="font-semibold text-[#111111]">Gespreksnotitie:</span>
                        ) : (
                          <span className="font-semibold text-[#111111]">Bericht:</span>
                        )}
                        {' '}
                        {event.messageBody}
                      </p>
                    ) : null}

                    {event.errorMessage ? (
                      <p className="mt-2 rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        Foutmelding: {event.errorMessage}
                      </p>
                    ) : null}
                  </div>
                ))}

                {communicationDrawer.channel === 'WHATSAPP' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-400"
                  >
                    Nieuw WhatsApp-bericht openen
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
