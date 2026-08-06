type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-[#F8F8F8] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#111111]">{value}</p>
      <p className="mt-2 text-sm font-medium text-[#D4AF37]">{detail}</p>
    </div>
  );
}
