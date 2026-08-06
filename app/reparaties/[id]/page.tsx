import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { getCustomerById } from '@/lib/repositories/customers';
import { getRepairById } from '@/lib/repair-service';

type RepairDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

function formatServiceDate(value?: string) {
  if (!value) return '-';

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('nl-NL');
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }

  return value;
}

export default async function RepairDetailPage({ params }: RepairDetailPageProps) {
  const { id } = await params;
  const repair = await getRepairById(id);

  if (!repair) {
    notFound();
  }

  const customer = repair.customerId ? await getCustomerById(repair.customerId) : null;

  return (
    <PageShell>
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Reparatie</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#111111]">{repair.id}</h1>
            <p className="mt-2 text-sm text-slate-600">Snelle statuscheck voor de balie.</p>
          </div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">{repair.status}</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[14px] border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Klant</p>
            <p className="mt-1 text-lg font-semibold text-[#111111]">{repair.customer}</p>
            <p className="mt-1 text-sm text-slate-700">{repair.phone}</p>
          </div>
          <div className="rounded-[14px] border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Machine</p>
            <p className="mt-1 text-lg font-semibold text-[#111111]">{repair.brand} {repair.model}</p>
            <p className="mt-1 text-sm text-slate-700">{repair.machine}</p>
          </div>
          <div className="rounded-[14px] border border-slate-200 bg-white p-4 md:col-span-2">
            <p className="text-sm text-slate-500">Gratis onderhoudsservice</p>
            <p className="mt-1 text-lg font-semibold text-[#111111]">{customer?.maintenanceReminderOptIn ? 'Actief' : 'Niet actief'}</p>
            <p className="mt-1 text-sm text-slate-700">Volgende herinnering: {formatServiceDate(customer?.nextMaintenanceReminderDate ?? repair.nextMaintenanceDate)}</p>
            {customer?.maintenanceConsentDate ? (
              <p className="mt-1 text-xs text-slate-500">Toestemming vastgelegd op {formatServiceDate(customer.maintenanceConsentDate)} door {customer.maintenanceConsentEmployee || 'onbekend'}.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-[14px] border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Klantmelding</p>
          <p className="mt-2 text-base text-slate-800">{repair.issue}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/nieuwe-reparatie" className="rounded-[14px] bg-[#111111] px-4 py-2 text-sm font-semibold text-white">
            + Nieuwe reparatie
          </Link>
          <Link href="/machine-ophalen" className="rounded-[14px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111111]">
            Naar machine ophalen
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
