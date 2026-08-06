'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { SearchBar } from '@/components/ui/search-bar';
import { RepairCard } from '@/components/repair-card';
import { HandoverPanel } from '@/components/workflow/handover-panel';
import { RepairDetailsPanel } from '@/components/workflow/repair-details-panel';
import { loadRepairsByStatus, handoverMachine } from '@/lib/repair-service';
import { getCurrentDate } from '@/lib/workshop-info';
import type { Repair, PaymentStatus } from '@/types/repair';

export default function MachineOphalenPage() {
  const [query, setQuery] = useState('');
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [handoverMessage, setHandoverMessage] = useState('');

  useEffect(() => {
    async function load() {
      const data = await loadRepairsByStatus('READY');
      setRepairs(data);
    }

    load();
  }, []);

  const filteredRepairs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return repairs;
    }

    return repairs.filter((repair) => {
      const haystack = [repair.customer, repair.phone, repair.id, repair.city].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, repairs]);

  const handleSelectRepair = (repair: Repair) => {
    setSelectedRepair(repair);
    setHandoverMessage('');
  };

  const handleHandover = async (paymentStatus: PaymentStatus, _maintenanceReminderOptIn: boolean) => {
    if (!selectedRepair) {
      return;
    }

    await handoverMachine(selectedRepair.id, paymentStatus);
    const remaining = repairs.filter((repair) => repair.id !== selectedRepair.id);
    setRepairs(remaining);
    setSelectedRepair(null);
    setHandoverMessage(`Reparatie ${selectedRepair.id} succesvol afgeleverd op ${getCurrentDate()}.`);
  };

  return (
    <PageShell>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[16px] bg-white p-6 shadow-[0_10px_30px_rgba(17,17,17,0.06)]">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Machine Ophalen</p>
                <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Klaar voor afhaling</h1>
              </div>
              <p className="text-sm text-slate-500">Selecteer een dossier en rond de aflevering af.</p>
            </div>
            <SearchBar placeholder="Zoek op klant, telefoon of reparatienummer" value={query} onChange={setQuery} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredRepairs.length > 0 ? (
              filteredRepairs.map((repair) => (
                <RepairCard key={repair.id} repair={repair} actionLabel="Afgeven" onAction={() => handleSelectRepair(repair)} />
              ))
            ) : (
              <Card>
                <p className="text-base text-slate-600">Er zijn momenteel geen machines klaar om op te halen.</p>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {handoverMessage ? (
            <Card className="rounded-[16px] border border-green-200 bg-emerald-50 text-slate-900">
              <p className="font-semibold">Aflevering voltooid</p>
              <p className="mt-2">{handoverMessage}</p>
            </Card>
          ) : null}

          {selectedRepair ? (
            <>
              <RepairDetailsPanel repair={selectedRepair} />
              <HandoverPanel repair={selectedRepair} onHandover={handleHandover} />
            </>
          ) : (
            <Card>
              <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Volgende stap</p>
              <p className="mt-3 text-slate-600">Selecteer een reparatie die klaar is voor ophalen om het uitgifteproces te starten.</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
