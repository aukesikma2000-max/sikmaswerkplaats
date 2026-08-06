import Image from 'next/image';
import { WORKSHOP_NAME } from '@/lib/workshop-info';

type TopbarProps = {
  title: string;
  subtitle: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  const today = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[16px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(17,17,17,0.03)] md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#F8F8F8] p-2">
          <Image src="/logo.png" alt="Sikma's Werkplaats logo" width={48} height={48} className="h-12 w-12 object-contain" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#D4AF37]">{today}</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#111111]">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      <div className="rounded-[16px] bg-[#F8F8F8] px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold">{WORKSHOP_NAME}</p>
        <p>Live verbonden met Supabase</p>
      </div>
    </div>
  );
}
