import { PageShell } from '@/components/ui/page-shell';
import { CustomerManagement } from '@/components/customers/customer-management';
import { listCustomers } from '@/lib/repositories/customers';
import type { Customer } from '@/types/repair';

export const dynamic = 'force-dynamic';

type KlantenPageProps = {
  searchParams?: Promise<{
    edit?: string;
    nieuw?: string;
  }>;
};

export default async function KlantenPage({ searchParams }: KlantenPageProps) {
  let customers: Customer[] = [];
  let loadError: string | null = null;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  try {
    customers = await listCustomers();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Onbekende fout tijdens laden van klanten';
  }

  return (
    <PageShell>
      {loadError ? (
        <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-semibold text-rose-800">Klanten konden niet geladen worden</p>
          <p className="mt-2 text-sm text-rose-700">{loadError}</p>
        </div>
      ) : (
        <CustomerManagement
          initialCustomers={customers}
          initialEditId={resolvedSearchParams?.edit ?? null}
          initialCreateMode={resolvedSearchParams?.nieuw === '1'}
        />
      )}
    </PageShell>
  );
}
