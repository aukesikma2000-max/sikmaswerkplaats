'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/ui/page-shell';
import { canAccessRoute } from '@/lib/access-control';
import { DEFAULT_WORKSHOP_USER, getActiveWorkshopUserRecord, type WorkshopUser } from '@/lib/active-user';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import { loadActiveWorkshopRepairs } from '@/lib/repair-service';
import { formatOutcomeLabel, getOutcomeBadgeClass, getStatusAccentClass, getStatusBadgeClass } from '@/lib/workflow';
import type { Repair, RepairStatus } from '@/types/repair';

type SectionConfig = {
  key: RepairStatus;
  title: string;
};

const sections: SectionConfig[] = [
  { key: 'NEW', title: 'NIEUW' },
  { key: 'IN_WORKSHOP', title: 'IN BEHANDELING' },
  { key: 'WAITING_FOR_CUSTOMER', title: 'WACHT OP KLANT' },
  { key: 'WAITING_FOR_PARTS', title: 'WACHT OP ONDERDELEN' },
  { key: 'READY', title: 'KLAAR' },
];

function toDateValue(value?: string) {
  if (!value) return null;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  return new Date(year, month, day);
}

function getIntakeDate(repair: Repair) {
  return toDateValue(repair.createdAt) ?? toDateValue(repair.date) ?? new Date();
}

function getIntakeDateLabel(repair: Repair) {
  const intake = getIntakeDate(repair);
  return intake.toLocaleDateString('nl-NL');
}

function getIntakeTimeLabel(repair: Repair) {
  const intake = toDateValue(repair.createdAt);
  if (!intake) return '--:--';
  return intake.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function compareRepairsBySection(status: RepairStatus, left: Repair, right: Repair) {
  if (status === 'NEW') {
    return getIntakeDate(left).getTime() - getIntakeDate(right).getTime();
  }

  if (status === 'IN_WORKSHOP') {
    const leftUpdated = toDateValue(left.statusUpdatedAt ?? left.updatedAt)?.getTime() ?? 0;
    const rightUpdated = toDateValue(right.statusUpdatedAt ?? right.updatedAt)?.getTime() ?? 0;
    return rightUpdated - leftUpdated;
  }

  if (status === 'WAITING_FOR_CUSTOMER') {
    const leftWaiting = toDateValue(left.statusUpdatedAt ?? left.updatedAt)?.getTime() ?? 0;
    const rightWaiting = toDateValue(right.statusUpdatedAt ?? right.updatedAt)?.getTime() ?? 0;
    return leftWaiting - rightWaiting;
  }

  if (status === 'WAITING_FOR_PARTS') {
    const leftExpected = toDateValue(left.expectedDeliveryDate)?.getTime();
    const rightExpected = toDateValue(right.expectedDeliveryDate)?.getTime();

    if (typeof leftExpected === 'number' && typeof rightExpected === 'number') {
      return leftExpected - rightExpected;
    }

    if (typeof leftExpected === 'number') return -1;
    if (typeof rightExpected === 'number') return 1;

    const leftWaiting = toDateValue(left.statusUpdatedAt ?? left.updatedAt)?.getTime() ?? 0;
    const rightWaiting = toDateValue(right.statusUpdatedAt ?? right.updatedAt)?.getTime() ?? 0;
    return leftWaiting - rightWaiting;
  }

  if (status === 'READY') {
    const leftReady = toDateValue(left.readyAt ?? left.statusUpdatedAt ?? left.updatedAt)?.getTime() ?? 0;
    const rightReady = toDateValue(right.readyAt ?? right.statusUpdatedAt ?? right.updatedAt)?.getTime() ?? 0;
    return leftReady - rightReady;
  }

  return 0;
}

export default function WerkplaatsPage() {
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);
  const [repairs, setRepairs] = useState<Repair[]>([]);

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
      const data = await loadActiveWorkshopRepairs();
      if (!active) return;
      setRepairs(data.filter((repair) => repair.status !== 'COMPLETED'));
    }

    load().catch(() => {
      if (!active) return;
      setRepairs([]);
    });

    return () => {
      active = false;
    };
  }, []);

  const groupedCount = useMemo(() => {
    const counts = new Map<string, number>();
    repairs.forEach((repair) => {
      if (!repair.repairGroupId) return;
      counts.set(repair.repairGroupId, (counts.get(repair.repairGroupId) ?? 0) + 1);
    });
    return counts;
  }, [repairs]);

  const sectionsData = useMemo(() => {
    return sections.map((section) => ({
      ...section,
      repairs: repairs
        .filter((repair) => repair.status === section.key)
        .sort((left, right) => compareRepairsBySection(section.key, left, right)),
    }));
  }, [repairs]);

  if (!canAccessRoute(activeUser.role, '/werkplaats')) {
    return (
      <PageShell backgroundClassName="bg-[#F2F0EB]">
        <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Geen toegang</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Werkplaats niet beschikbaar</h1>
          <p className="mt-2 text-sm text-slate-500">Met de rol Front Desk is dit scherm niet toegankelijk.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell backgroundClassName="bg-[#F2F0EB]">
      <div className="space-y-6">

        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-[#D4AF37]">Werkplaats</p>
          <h1 className="mt-1 text-3xl font-bold text-[#111111]">Werkplaatsoverzicht</h1>
          <p className="mt-1 text-sm text-slate-500">Actieve werkbonnen per status — klik een bon om het reparatiedossier te openen.</p>
        </div>

        {sectionsData.map((section) => (
          <section key={section.key} className="space-y-3">

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-300" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">{section.title}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusBadgeClass(section.key)}`}>
                  {section.repairs.length}
                </span>
              </div>
              <div className="h-px flex-1 bg-slate-300" />
            </div>

            {!section.repairs.length ? (
              <p className="py-1 text-center text-sm text-slate-400">Geen openstaande werkbonnen.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {section.repairs.map((repair) => {
                  const linkedCount = repair.repairGroupId ? (groupedCount.get(repair.repairGroupId) ?? 0) : 0;
                  const outcomeLabel = formatOutcomeLabel(repair.repairOutcome);
                  const accentClass = getStatusAccentClass(repair.status);

                  return (
                    <Link
                      key={repair.id}
                      href={`/werkplaats/${encodeURIComponent(repair.id)}`}
                      className={`group block rounded-[16px] border border-slate-200 border-l-4 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:border-slate-300 ${accentClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-[#111111]">{getDisplayRepairNumber(repair)}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(repair.status)}`}>
                          {section.title}
                        </span>
                      </div>

                      <p className="mt-2 text-base font-semibold text-[#111111] leading-tight">
                        {repair.customer || <span className="italic text-slate-400">Onbekende klant</span>}
                      </p>
                      <p className="text-sm text-slate-500">{repair.city || ''}</p>

                      {repair.machine ? (
                        <p className="mt-1 text-xs text-slate-400">{repair.machine}</p>
                      ) : null}

                      {outcomeLabel ? (
                        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getOutcomeBadgeClass(repair.repairOutcome)}`}>
                          {outcomeLabel}
                        </span>
                      ) : null}

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
                        <span>Binnenkomst: {getIntakeDateLabel(repair)}</span>
                        <span>{getIntakeTimeLabel(repair)}</span>
                      </div>

                      {linkedCount > 1 ? (
                        <p className="mt-1 text-xs font-semibold text-[#D4AF37]">🔗 {linkedCount} gekoppelde werkbonnen</p>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
