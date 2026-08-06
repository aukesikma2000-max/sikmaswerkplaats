'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { RepairTable } from '@/components/repair-table';
import { loadRepairsByStatus } from '@/lib/repair-service';
import { canAccessRoute } from '@/lib/access-control';
import { DEFAULT_WORKSHOP_USER, getActiveWorkshopUserRecord, type WorkshopUser } from '@/lib/active-user';
import type { Repair } from '@/types/repair';

export default function ArchiefPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);

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
    async function load() {
      const data = await loadRepairsByStatus('COMPLETED');
      setRepairs(data);
    }

    load();
  }, []);

  if (!canAccessRoute(activeUser.role, '/archief')) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Geen toegang</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Archief niet beschikbaar</h1>
          <p className="mt-3 text-sm text-slate-600">Met de rol Front Desk is dit scherm niet toegankelijk.</p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card>
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Archief</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Afgeronde dossiers</h1>
          <p className="mt-3 text-sm text-slate-600">Bekijk reparaties die zijn afgerond of al zijn afgeleverd.</p>
        </div>
        <RepairTable repairs={repairs} />
      </Card>
    </PageShell>
  );
}
