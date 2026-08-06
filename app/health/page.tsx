import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { getSupabaseConfig } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

type TableCheck = {
  table: string;
  count: number | null;
  error: string | null;
};

const TABLES = ['customers', 'machines', 'repairs', 'repair_status_history', 'repair_notes'];

function getProjectRef(url: string): string {
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? 'onbekend';
}

function maskKey(key: string): string {
  if (key.length <= 12) {
    return `${key.slice(0, 4)}...`;
  }
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

async function runHealthChecks(): Promise<{
  projectRef: string;
  supabaseUrl: string;
  keyPreview: string;
  checks: TableCheck[];
  environmentError?: string;
}> {
  try {
    const { url, publicKey } = getSupabaseConfig();
    const supabase = createClient(url, publicKey);

    const checks = await Promise.all(
      TABLES.map(async (table) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        return {
          table,
          count: error ? null : count ?? 0,
          error: error?.message ?? null,
        } satisfies TableCheck;
      }),
    );

    return {
      projectRef: getProjectRef(url),
      supabaseUrl: url,
      keyPreview: maskKey(publicKey),
      checks,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout tijdens health check';
    return {
      projectRef: 'onbekend',
      supabaseUrl: 'onbekend',
      keyPreview: 'onbekend',
      checks: [],
      environmentError: message,
    };
  }
}

export default async function HealthPage() {
  const result = await runHealthChecks();
  const hasErrors = result.checks.some((check) => Boolean(check.error));
  const allZeroVisible = result.checks.length > 0 && result.checks.every((check) => !check.error && (check.count ?? 0) === 0);

  return (
    <PageShell>
      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Health Check</p>
                <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Supabase verbinding</h1>
                <p className="mt-3 text-sm text-slate-600">Deze pagina controleert live of de webapp data kan lezen met dezelfde public key als de frontend.</p>
              </div>
              <Link href="/instellingen" className="rounded-[16px] border border-slate-200 px-4 py-2 text-sm font-semibold text-[#111111]">
                Terug naar instellingen
              </Link>
            </div>

            {result.environmentError ? (
              <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <p className="font-semibold">Environment fout</p>
                <p className="mt-1">{result.environmentError}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Project ref</p>
                  <p className="mt-2 text-lg font-semibold text-[#111111]">{result.projectRef}</p>
                </div>
                <div className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Supabase URL</p>
                  <p className="mt-2 break-all text-sm font-semibold text-[#111111]">{result.supabaseUrl}</p>
                </div>
                <div className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Public key (masked)</p>
                  <p className="mt-2 break-all text-sm font-semibold text-[#111111]">{result.keyPreview}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#111111]">Data zichtbaarheid per tabel</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                hasErrors ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {hasErrors ? 'Problemen gevonden' : 'Alles leesbaar'}
            </span>
          </div>

          <div className="space-y-3">
            {result.checks.map((check) => (
              <div key={check.table} className="rounded-[14px] border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="font-semibold text-[#111111]">public.{check.table}</p>
                  {check.error ? (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">Error</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">OK</span>
                  )}
                </div>
                {check.error ? (
                  <p className="mt-2 text-sm text-rose-800">{check.error}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">Aantal rijen zichtbaar voor frontend key: {check.count}</p>
                )}
              </div>
            ))}
            {!result.checks.length && !result.environmentError ? (
              <p className="text-sm text-slate-600">Geen tabelchecks uitgevoerd.</p>
            ) : null}
          </div>

          {allZeroVisible ? (
            <div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Alle tabellen zijn leeg voor deze app-verbinding</p>
              <p className="mt-1">
                De webapp is gekoppeld aan projectref <span className="font-semibold">{result.projectRef}</span>. In dit project ziet de frontend nu overal 0 rijen.
              </p>
              <p className="mt-2">Voer in Supabase SQL Editor deze scripts in volgorde uit:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>db/sample_customers.sql</li>
                <li>db/sample_machines_repairs.sql</li>
                <li>db/fix_frontend_visibility.sql</li>
              </ol>
              <p className="mt-2">Herlaad daarna deze pagina. De counts moeten dan groter zijn dan 0.</p>
            </div>
          ) : null}
        </Card>
      </div>
    </PageShell>
  );
}
