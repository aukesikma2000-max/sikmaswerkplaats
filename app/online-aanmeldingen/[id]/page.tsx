'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { canAccessRoute } from '@/lib/access-control';
import { DEFAULT_WORKSHOP_USER, getActiveWorkshopUserRecord, type WorkshopUser } from '@/lib/active-user';
import { convertOnlineSubmissionToRepair, getRepairById } from '@/lib/repair-service';
import type { Repair } from '@/types/repair';

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

function formatDateTime(value?: string) {
  const date = toDate(value);
  if (!date) return '-';
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildTimelineItems(repair: Repair) {
  const items = repair.history.map((entry) => ({
    title: entry.note || entry.status,
    timestamp: entry.timestamp,
    user: entry.user,
  }));

  if (!items.length && repair.websiteSubmissionDate) {
    items.push({
      title: 'Vooraanmelding ontvangen via website.',
      timestamp: repair.websiteSubmissionDate,
      user: repair.source ?? 'Website',
    });
  }

  return items.sort((left, right) => (toDate(left.timestamp)?.getTime() ?? 0) - (toDate(right.timestamp)?.getTime() ?? 0));
}

export default function OnlineAanmeldingDetailPage() {
  const params = useParams<{ id: string }>();
  const repairId = decodeURIComponent(params?.id ?? '');
  const router = useRouter();

  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    setLoading(true);
    getRepairById(repairId)
      .then((data) => {
        if (!active) return;
        setRepair(data);
        if (!data) {
          setErrorMessage('Vooraanmelding niet gevonden.');
        }
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Laden mislukt.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repairId]);

  const timeline = useMemo(() => {
    if (!repair) return [];
    return buildTimelineItems(repair);
  }, [repair]);

  const canUseWorkshop = canAccessRoute(activeUser.role, '/werkplaats');

  async function handleReceiveMachine() {
    if (!repair || repair.status !== 'VOORAANMELDING') return;
    setSaving(true);
    setErrorMessage('');

    try {
      const updated = await convertOnlineSubmissionToRepair(repair.id);
      setRepair(updated);
      const targetHref = canUseWorkshop ? `/werkplaats/${encodeURIComponent(updated.id)}` : `/reparaties/${encodeURIComponent(updated.id)}`;
      router.push(targetHref);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ontvangen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm text-slate-500">Vooraanmelding laden...</p>
        </Card>
      </PageShell>
    );
  }

  if (!repair) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Online</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Vooraanmelding niet gevonden</h1>
          <Link href="/online-aanmeldingen" className="mt-5 inline-flex rounded-[12px] border border-slate-300 px-4 py-2 text-sm font-semibold text-[#111111] hover:border-slate-400">
            Terug naar overzicht
          </Link>
        </Card>
      </PageShell>
    );
  }

  if (repair.status !== 'VOORAANMELDING') {
    return (
      <PageShell>
        <Card>
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Online</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Deze aanvraag is al ontvangen</h1>
          <p className="mt-2 text-sm text-slate-600">Deze vooraanmelding is al omgezet naar een officiële reparatie.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={canUseWorkshop ? `/werkplaats/${encodeURIComponent(repair.id)}` : `/reparaties/${encodeURIComponent(repair.id)}`} className="rounded-[12px] bg-[#111111] px-4 py-2 text-sm font-semibold text-white">
              Open officieel dossier
            </Link>
            <Link href="/online-aanmeldingen" className="rounded-[12px] border border-slate-300 px-4 py-2 text-sm font-semibold text-[#111111]">
              Terug naar overzicht
            </Link>
          </div>
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
              <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Online Aanmelding</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#111111]">{repair.customer}</h1>
              <p className="mt-2 text-sm text-slate-600">Vooraanmelding ontvangen via de website.</p>
            </div>
            <StatusBadge status={repair.status} />
          </div>
        </Card>

        {errorMessage ? (
          <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <p className="text-sm uppercase tracking-[0.24em] text-[#D4AF37]">Klant</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Naam</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{repair.customer}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Telefoon</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{repair.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">E-mail</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{repair.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Woonplaats</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{repair.city || '-'}</p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <p className="text-sm uppercase tracking-[0.24em] text-[#D4AF37]">Machine</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Merk</p>
                  <p className="mt-1 text-base font-semibold text-[#111111]">{repair.brand || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Omschrijving probleem</p>
                  <p className="mt-1 text-base font-semibold text-[#111111]">{repair.issue || '-'}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bron</p>
                  <p className="mt-1 text-base font-semibold text-[#111111]">{repair.source ?? 'Website'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                  <p className="mt-1 text-base font-semibold text-[#111111]">Vooraanmelding</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <p className="text-sm uppercase tracking-[0.24em] text-[#D4AF37]">Tijdlijn</p>
          <div className="mt-4 space-y-3">
            {timeline.map((entry) => (
              <div key={`${entry.timestamp}-${entry.title}`} className="rounded-[16px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-[#111111]">{entry.title}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(entry.timestamp)} · {entry.user}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#D4AF37]">Actie</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111111]">Machine ontvangen</h2>
              <p className="mt-2 text-sm text-slate-600">Met één klik wordt deze vooraanmelding een officieel reparatiedossier.</p>
            </div>
            <button
              type="button"
              onClick={handleReceiveMachine}
              disabled={saving}
              className="rounded-[16px] bg-[#111111] px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Bezig met ontvangen...' : 'Machine ontvangen'}
            </button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
