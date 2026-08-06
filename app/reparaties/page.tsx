'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import { loadRepairsByStatus } from '@/lib/repair-service';
import type { Repair, RepairStatus } from '@/types/repair';

const FILTERS: Array<{ label: string; value: RepairStatus | 'ALL'; statuses: RepairStatus[] }> = [
  { label: 'Klaar', value: 'READY', statuses: ['READY'] },
  { label: 'Wachten op klant', value: 'WAITING_FOR_CUSTOMER', statuses: ['WAITING_FOR_CUSTOMER'] },
  { label: 'Wachten op onderdelen', value: 'WAITING_FOR_PARTS', statuses: ['WAITING_FOR_PARTS'] },
  { label: 'Afgerond', value: 'COMPLETED', statuses: ['COMPLETED'] },
  { label: 'Alles', value: 'ALL', statuses: ['NEW', 'IN_WORKSHOP', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_PARTS', 'READY', 'COMPLETED'] },
];

export default function ReparatiesOverzichtPage() {
  const [activeFilter, setActiveFilter] = useState<RepairStatus | 'ALL'>('ALL');
  const [repairs, setRepairs] = useState<Repair[]>([]);

  useEffect(() => {
    const statusParam = new URLSearchParams(window.location.search).get('status') as RepairStatus | null;
    if (!statusParam) return;

    if (FILTERS.some((entry) => entry.value === statusParam)) {
      setActiveFilter(statusParam);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const filter = FILTERS.find((entry) => entry.value === activeFilter) ?? FILTERS[FILTERS.length - 1];
      const data = await loadRepairsByStatus(filter.statuses);
      if (!active) return;
      setRepairs(data);
    }

    load().catch(() => {
      if (!active) return;
      setRepairs([]);
    });

    return () => {
      active = false;
    };
  }, [activeFilter]);

  const selectedFilter = useMemo(() => FILTERS.find((entry) => entry.value === activeFilter) ?? FILTERS[FILTERS.length - 1], [activeFilter]);

  return (
    <PageShell>
      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Reparatieoverzicht</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Workflowfilters</h1>
            <p className="mt-2 text-sm text-slate-600">Filter direct op de nieuwe werkprocesstatussen.</p>
          </div>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Actief: {selectedFilter.label}</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                activeFilter === filter.value
                  ? 'border-[#D4AF37] bg-[#FFF8E0] text-[#7D5A00]'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {repairs.map((repair) => (
            <Link
              key={repair.id}
              href={`/reparaties/${encodeURIComponent(repair.id)}`}
              className="block rounded-[14px] border border-slate-200 bg-white p-4 transition hover:border-[#D4AF37]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-[#111111]">{getDisplayRepairNumber(repair)}</p>
                  <p className="text-sm text-slate-700">{repair.customer}</p>
                  <p className="text-sm text-slate-600">{repair.issue}</p>
                </div>
                <StatusBadge status={repair.status} />
              </div>
            </Link>
          ))}
          {!repairs.length ? <p className="text-sm text-slate-600">Geen reparaties voor dit filter.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
