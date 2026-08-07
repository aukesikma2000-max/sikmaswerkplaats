'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import { loadRepairCommunication, loadRepairsByStatus } from '@/lib/repair-service';
import { normalizeWorkflowStatus } from '@/lib/workflow';
import type { CommunicationChannel, CommunicationEvent, Repair } from '@/types/repair';

const STATUS_ORDER: Record<string, number> = {
  READY: 0,
  IN_WORKSHOP: 1,
  WAITING_FOR_PARTS: 2,
  WAITING_FOR_CUSTOMER: 3,
  COMPLETED: 4,
};

const COMMUNICATION_CHANNELS: Array<{ channel: CommunicationChannel; icon: string; label: string }> = [
  { channel: 'WHATSAPP', icon: '💬', label: 'WhatsApp' },
  { channel: 'EMAIL', icon: '✉️', label: 'E-mail' },
  { channel: 'PHONE', icon: '📞', label: 'Gebeld' },
];

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const dateMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!dateMatch) return null;

  const yearRaw = dateMatch[3];
  const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[1]);
  const hours = Number(dateMatch[4] ?? '0');
  const minutes = Number(dateMatch[5] ?? '0');
  return new Date(year, month, day, hours, minutes);
}

function getRepairSortTimestamp(repair: Repair) {
  const candidates = [
    repair.readyAt,
    repair.statusUpdatedAt,
    repair.updatedAt,
    repair.createdAt,
    repair.deliveryDate,
    repair.archivedDate,
    repair.date,
  ];

  for (const candidate of candidates) {
    const parsed = parseDate(candidate);
    if (parsed) return parsed.getTime();
  }

  return 0;
}

function getStatusGroup(repair: Repair) {
  const status = normalizeWorkflowStatus(repair.status);
  if (status === 'NEW') return 'IN_WORKSHOP';
  return status;
}

function getStatusPill(repair: Repair) {
  const status = getStatusGroup(repair);
  if (status === 'READY') return { label: 'Klaar', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
  if (status === 'WAITING_FOR_PARTS') return { label: 'Wacht op onderdelen', className: 'bg-amber-100 text-amber-800 border border-amber-200' };
  if (status === 'WAITING_FOR_CUSTOMER') return { label: 'Wacht op klant', className: 'bg-orange-100 text-orange-800 border border-orange-200' };
  if (status === 'IN_WORKSHOP') return { label: 'In behandeling', className: 'bg-sky-100 text-sky-800 border border-sky-200' };
  if (repair.archivedDate) return { label: 'Gearchiveerd', className: 'bg-zinc-200 text-zinc-900 border border-zinc-300' };
  return { label: 'Afgegeven', className: 'bg-zinc-200 text-zinc-900 border border-zinc-300' };
}

function getMachineLine(repair: Repair) {
  const brand = repair.brand?.trim() ?? '';
  const model = repair.model?.trim() ?? '';
  const serial = repair.serialNumber?.trim() ?? '';
  const base = [brand, model].filter(Boolean).join(' ').trim() || repair.machine || '-';
  return serial ? `${base} · ${serial}` : base;
}

export default function MachineOphalenPage() {
  const router = useRouter();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [communicationByRepair, setCommunicationByRepair] = useState<Record<string, CommunicationEvent[]>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      const [ready, inWorkshop, waitingForParts, waitingForCustomer, completed] = await Promise.all([
        loadRepairsByStatus('READY'),
        loadRepairsByStatus(['NEW', 'IN_WORKSHOP']),
        loadRepairsByStatus('WAITING_FOR_PARTS'),
        loadRepairsByStatus('WAITING_FOR_CUSTOMER'),
        loadRepairsByStatus('COMPLETED'),
      ]);

      if (!active) return;

      const combined = [...ready, ...inWorkshop, ...waitingForParts, ...waitingForCustomer, ...completed].sort((a, b) => {
        const statusDelta = STATUS_ORDER[getStatusGroup(a)] - STATUS_ORDER[getStatusGroup(b)];
        if (statusDelta !== 0) return statusDelta;
        return getRepairSortTimestamp(b) - getRepairSortTimestamp(a);
      });

      setRepairs(combined);

      const repairIds = combined.map((repair) => repair.id);
      const communicationEvents = await loadRepairCommunication(repairIds);
      if (!active) return;

      const grouped = communicationEvents.reduce<Record<string, CommunicationEvent[]>>((accumulator, event) => {
        if (!event.repairId) return accumulator;
        if (!accumulator[event.repairId]) accumulator[event.repairId] = [];
        accumulator[event.repairId].push(event);
        return accumulator;
      }, {});

      setCommunicationByRepair(grouped);
    }

    load().catch(() => {
      if (!active) return;
      setRepairs([]);
      setCommunicationByRepair({});
    });

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => repairs, [repairs]);

  return (
    <PageShell>
      <div className="space-y-6">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Machine afgeven</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Balieoverzicht dossiers</h1>
            <p className="mt-2 text-sm text-slate-600">Actieve en oude reparaties in één lijst. Open direct het dossier om verder te werken.</p>
          </div>

          <div className="p-0">
            {rows.map((repair) => {
              const events = communicationByRepair[repair.id] ?? [];
              const usedChannels = COMMUNICATION_CHANNELS.filter((channel) => events.some((event) => event.channel === channel.channel));
              const statusPill = getStatusPill(repair);

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
                  <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr_1.6fr_1fr_auto_auto_auto] xl:items-start">
                    <div className="min-h-[56px]">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Reparatienummer</p>
                      <p className="mt-1 text-sm font-semibold text-[#111111]">{getDisplayRepairNumber(repair)}</p>
                    </div>

                    <div className="min-h-[56px]">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Klant</p>
                      <p className="mt-1 text-sm font-semibold text-[#111111]">{repair.customer || '-'}</p>
                      <p className="text-sm text-slate-600">{[repair.phone, repair.email, repair.city].filter(Boolean).join(' · ') || '\u00A0'}</p>
                    </div>

                    <div className="min-h-[56px]">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Machine</p>
                      <p className="mt-1 text-sm font-semibold text-[#111111]">{getMachineLine(repair)}</p>
                      <p className="text-sm text-slate-600">{repair.issue || '\u00A0'}</p>
                    </div>

                    <div className="min-h-[56px]">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Communicatie</p>
                      <div className="mt-1 flex items-center gap-2">
                        {usedChannels.length ? usedChannels.map((channel) => (
                          <span
                            key={channel.channel}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-base"
                            title={channel.label}
                          >
                            {channel.icon}
                          </span>
                        )) : <span className="text-sm text-slate-400">-</span>}
                      </div>
                    </div>

                    <div className="min-h-[56px]">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status</p>
                      <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusPill.className}`}>
                        {statusPill.label}
                      </span>
                    </div>

                    <div className="min-h-[56px]">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bedrag</p>
                      <p className="mt-1 text-sm font-semibold text-[#111111]">{repair.price > 0 ? `€ ${repair.price.toFixed(2)}` : '-'}</p>
                    </div>

                    <div className="min-h-[56px]">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Actie</p>
                      <Link
                        href={`/reparaties/${encodeURIComponent(repair.id)}`}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1 inline-flex items-center rounded-[12px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111111] transition hover:border-[#D4AF37]"
                      >
                        Dossier openen →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {!rows.length ? (
              <div className="px-5 py-6 text-sm text-slate-500">
                Er zijn momenteel geen reparaties beschikbaar.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
