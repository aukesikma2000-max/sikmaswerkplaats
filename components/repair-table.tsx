import { StatusBadge } from '@/components/ui/status-badge';
import { Table } from '@/components/ui/table';
import type { Repair } from '@/types/repair';

type RepairTableProps = {
  repairs: Repair[];
};

export function RepairTable({ repairs }: RepairTableProps) {
  return (
    <Table
      headers={['Reparatienummer', 'Klant', 'Omschrijving', 'Status', 'Datum']}
      rows={repairs.map((repair) => (
        <>
          <td className="px-4 py-3 font-semibold text-slate-800">{repair.id}</td>
          <td className="px-4 py-3 text-slate-700">{repair.customer}</td>
          <td className="px-4 py-3 text-slate-700">{repair.issue}</td>
          <td className="px-4 py-3">
            <StatusBadge status={repair.status} />
          </td>
          <td className="px-4 py-3 text-slate-700">{repair.date}</td>
        </>
      ))}
    />
  );
}
