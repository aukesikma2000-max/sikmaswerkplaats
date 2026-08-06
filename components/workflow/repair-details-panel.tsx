import { StatusBadge } from '@/components/ui/status-badge';
import { Card } from '@/components/ui/card';
import type { Repair } from '@/types/repair';

type RepairDetailsPanelProps = {
  repair: Repair;
};

export function RepairDetailsPanel({ repair }: RepairDetailsPanelProps) {
  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#D4AF37]">Reparatiedossier</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111111]">{repair.id}</h2>
          </div>
          <StatusBadge status={repair.status} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[16px] bg-[#F8F8F8] p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Klant</p>
            <p className="mt-2 text-sm font-semibold text-[#111111]">{repair.customer}</p>
            <p className="text-sm text-slate-600">{repair.phone}</p>
            <p className="text-sm text-slate-600">{repair.city}</p>
            <p className="mt-3 text-xs text-slate-500">
              Gratis onderhoudsservice: {repair.nextMaintenanceDate ? `Actief (volgende ${repair.nextMaintenanceDate})` : 'Niet geregistreerd'}
            </p>
          </div>
          <div className="rounded-[16px] bg-[#F8F8F8] p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Machine</p>
            <p className="mt-2 text-sm font-semibold text-[#111111]">{repair.machine}</p>
            <p className="mt-3 text-sm text-slate-600">Prijs: € {repair.price.toFixed(2).replace('.', ',')}</p>
            <p className="mt-2 text-sm text-slate-600">Betaalstatus: {repair.paymentStatus ?? 'Open'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-[16px] bg-[#F8F8F8] p-4 text-sm text-slate-700">
        <div>
          <p className="font-semibold text-[#111111]">Uitgevoerde werkzaamheden</p>
          <p className="mt-2 leading-7">{repair.repair}</p>
        </div>
        <div>
          <p className="font-semibold text-[#111111]">Opmerking werkplaats</p>
          <p className="mt-2 leading-7">{repair.notes || 'Geen extra opmerkingen'}</p>
        </div>
      </div>
    </Card>
  );
}
