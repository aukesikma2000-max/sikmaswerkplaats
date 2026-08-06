"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { canAccessRoute } from '@/lib/access-control';
import { DEFAULT_WORKSHOP_USER, getActiveWorkshopUserRecord, type WorkshopUser } from '@/lib/active-user';
import { loadMachines } from '@/lib/repair-service';
import type { Machine } from '@/types/repair';

export default function MachinesPage() {
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);
  const [machines, setMachines] = useState<Machine[]>([]);

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
    loadMachines().then(setMachines).catch(() => setMachines([]));
  }, []);

  if (!canAccessRoute(activeUser.role, '/machines')) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Geen toegang</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Machines niet beschikbaar</h1>
          <p className="mt-3 text-sm text-slate-600">Met de rol Front Desk is dit scherm niet toegankelijk.</p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Card>
        <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Machines</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Machineoverzicht</h1>
        <p className="mt-3 text-sm text-slate-600">Alle geregistreerde machines.</p>

        <div className="mt-6 space-y-3">
          {machines.map((machine) => (
            <div key={machine.id} className="rounded-[14px] border border-slate-200 bg-white p-4">
              <p className="font-semibold text-[#111111]">{machine.name}</p>
              <p className="text-sm text-slate-600">{machine.brand ?? '-'} {machine.model ?? ''}</p>
              <p className="text-xs text-slate-500">Serienummer: {machine.serialNumber ?? '-'}</p>
            </div>
          ))}
          {!machines.length ? <p className="text-sm text-slate-600">Nog geen machines gevonden.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
