import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import type { PickupRepair } from '@/types/repair';

type RepairCardProps = {
  repair: PickupRepair;
  actionLabel?: string;
  onAction?: () => void;
};

export function RepairCard({ repair, actionLabel = 'Afgeven', onAction }: RepairCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-[#111111]">{repair.customer}</p>
            <p className="mt-1 text-sm text-slate-600">{repair.city}</p>
          </div>
          <StatusBadge status={repair.status} />
        </div>

        <div className="mt-4 space-y-2 rounded-[16px] bg-[#F8F8F8] p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-800">Machine:</span> {repair.machine}
          </p>
          <p>
            <span className="font-semibold text-slate-800">Reparatie:</span> {getDisplayRepairNumber(repair)}
          </p>
          <p>
            <span className="font-semibold text-slate-800">Prijs:</span> € {repair.price.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {onAction ? (
        <Button variant="primary" onClick={onAction} type="button">
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
