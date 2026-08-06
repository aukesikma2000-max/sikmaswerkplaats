'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { canAccessRoute } from '@/lib/access-control';
import { DEFAULT_WORKSHOP_USER, getActiveWorkshopUserRecord, type WorkshopUser } from '@/lib/active-user';
import { loadRepairsByStatus } from '@/lib/repair-service';
import type { Repair } from '@/types/repair';

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function getSubmissionDate(repair: Repair) {
  return toDate(repair.websiteSubmissionDate ?? repair.createdAt ?? repair.date) ?? new Date(0);
}

function getSubmissionDateLabel(repair: Repair) {
  return getSubmissionDate(repair).toLocaleDateString('nl-NL');
}

function getSubmissionTimeLabel(repair: Repair) {
  return getSubmissionDate(repair).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export default function OnlineAanmeldingenPage() {
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
      const data = await loadRepairsByStatus('VOORAANMELDING');
      if (!active) return;
      setRepairs([...data].sort((left, right) => getSubmissionDate(right).getTime() - getSubmissionDate(left).getTime()));
    }

    load().catch(() => {
      if (!active) return;
      setRepairs([]);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!canAccessRoute(activeUser.role, '/online-aanmeldingen')) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Geen toegang</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Online aanmeldingen niet beschikbaar</h1>
          <p className="mt-2 text-sm text-slate-600">Met de huidige rol is dit scherm niet toegankelijk.</p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Online</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Nieuwe reparatieaanvragen vanaf de website</h1>
              <p className="mt-3 text-sm text-slate-600">Deze aanvragen zijn nog geen officiële reparaties. Ontvang ze hier aan de balie wanneer de klant binnenkomt.</p>
            </div>
            <div className="rounded-[16px] border border-amber-100 bg-[#FFF9E8] px-4 py-3 text-sm font-semibold text-[#111111]">
              {repairs.length} openstaand
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {repairs.map((repair) => (
            <Link key={repair.id} href={`/online-aanmeldingen/${encodeURIComponent(repair.id)}`} className="block">
              <Card className="h-full transition hover:border-[#D4AF37] hover:shadow-[0_14px_30px_rgba(17,17,17,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[#111111]">{repair.customer}</p>
                    <p className="mt-1 text-sm text-slate-600">{repair.brand || '-'}{repair.model ? ` ${repair.model}` : ''}</p>
                  </div>
                  <StatusBadge status={repair.status} />
                </div>

                <div className="mt-4 grid gap-3 rounded-[16px] bg-[#F8F8F8] p-4 text-sm text-slate-700 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Datum</p>
                    <p className="mt-1 font-semibold text-[#111111]">{getSubmissionDateLabel(repair)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tijd</p>
                    <p className="mt-1 font-semibold text-[#111111]">{getSubmissionTimeLabel(repair)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bron</p>
                    <p className="mt-1 font-semibold text-[#111111]">{repair.source ?? 'Website'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                    <p className="mt-1 font-semibold text-[#111111]">Vooraanmelding</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-600">
                  <span>{repair.phone}</span>
                  <span className="font-semibold text-[#111111]">Openen →</span>
                </div>
              </Card>
            </Link>
          ))}

          {!repairs.length ? (
            <Card>
              <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Leeg</p>
              <h2 className="mt-2 text-xl font-semibold text-[#111111]">Geen openstaande vooraanmeldingen</h2>
              <p className="mt-2 text-sm text-slate-600">Nieuwe website-aanvragen verschijnen hier zodra ze binnenkomen.</p>
            </Card>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
