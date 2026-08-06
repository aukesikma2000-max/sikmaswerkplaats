import { Card } from '@/components/ui/card';
import type { Repair } from '@/types/repair';

type RepairSummaryPanelProps = {
  repair: Repair;
};

export function RepairSummaryPanel({ repair }: RepairSummaryPanelProps) {
  return (
    <Card>
      <p className="text-sm uppercase tracking-[0.3em] text-[#D4AF37]">Statusgeschiedenis</p>
      <div className="mt-4 space-y-3 text-sm text-slate-700">
        {repair.history.map((entry) => (
          <div key={`${entry.status}-${entry.timestamp}`} className="rounded-[16px] bg-white p-4 shadow-[0_4px_12px_rgba(17,17,17,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[#111111]">{entry.status}</p>
              <span className="text-xs text-slate-500">{entry.timestamp}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{entry.note}</p>
            <p className="mt-1 text-xs text-slate-500">{entry.user}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
