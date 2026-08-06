'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { SearchBar } from '@/components/ui/search-bar';
import { MachineDeliveryPanel } from '@/components/workflow/machine-delivery-panel';
import { loadRepairsByStatus } from '@/lib/repair-service';
import { getCurrentDate } from '@/lib/workshop-info';
import type { Repair } from '@/types/repair';

export default function MachineOphalenPage() {
  const [query, setQuery] = useState('');
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [expandedRepairId, setExpandedRepairId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await loadRepairsByStatus('READY');
      setRepairs(data);

      const params = new URLSearchParams(window.location.search);
      const preselectedRepairId = params.get('repair');

      if (preselectedRepairId && data.some((repair) => repair.id === preselectedRepairId)) {
        setExpandedRepairId(preselectedRepairId);
      }
    }

    load();
  }, []);

  const filteredRepairs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return repairs;
    }

    return repairs.filter((repair) => {
      const haystack = [
        repair.customer,
        repair.phone,
        repair.city,
        repair.brand,
        repair.model,
        repair.machine,
        repair.repairNumber,
        repair.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, repairs]);

  const handleDelivered = (updatedRepair: Repair) => {
    setRepairs((current) => current.filter((entry) => entry.id !== updatedRepair.id));
    setExpandedRepairId((current) => (current === updatedRepair.id ? null : current));
    setDeliveryMessage(`Reparatie ${updatedRepair.repairNumber ?? updatedRepair.id} succesvol afgeleverd op ${getCurrentDate()}.`);
  };

  return (
    <PageShell>
      <div className="space-y-4">
        <div className="rounded-[16px] bg-white p-6 shadow-[0_10px_30px_rgba(17,17,17,0.06)]">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Machine afgeven</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Klaar voor afhaling</h1>
            </div>
            <p className="text-sm text-slate-500">Werk per dossier op dezelfde pagina en geef machines individueel af.</p>
          </div>
          <SearchBar placeholder="Zoek op klant, woonplaats, merk, type of reparatienummer" value={query} onChange={setQuery} />
        </div>

        {deliveryMessage ? (
          <Card className="rounded-[16px] border border-green-200 bg-emerald-50 text-slate-900">
            <p className="font-semibold">Aflevering voltooid</p>
            <p className="mt-2">{deliveryMessage}</p>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRepairs.length > 0 ? (
            filteredRepairs.map((repair) => (
              <MachineDeliveryPanel
                key={repair.id}
                repair={repair}
                expandLabel="Machine afgeven"
                onDelivered={handleDelivered}
                isOpen={expandedRepairId === repair.id}
                onOpenChange={(open) => setExpandedRepairId((current) => (open ? repair.id : (current === repair.id ? null : current)))}
              />
            ))
          ) : (
            <Card>
              <p className="text-base text-slate-600">Er staan momenteel geen machines klaar om af te geven.</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
