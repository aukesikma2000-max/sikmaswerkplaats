import { ReactNode } from 'react';

type TableProps = {
  headers: string[];
  rows: ReactNode[];
};

export function Table({ headers, rows }: TableProps) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#F8F8F8] text-slate-700">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-200">
              {row}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
