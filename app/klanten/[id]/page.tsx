import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { CommunicationBlock } from '@/components/communications/communication-block';
import { ServicePreferencesCard } from '@/components/customers/service-preferences-card';
import { PageShell } from '@/components/ui/page-shell';
import { listMaintenanceServiceAuditByCustomer } from '@/lib/repositories/maintenance-service-audit';
import { getCustomerById, getCustomerMachines, getCustomerRepairs } from '@/lib/repositories/customers';
import { listRepairNotes } from '@/lib/repositories/repair-notes';
import { listRepairStatusHistory } from '@/lib/repositories/repair-status-history';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function formatServiceDate(value?: string) {
  if (!value) return '-';

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;

  return value;
}

function formatServiceDatetime(value?: string) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type CustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const [machines, repairs, maintenanceAudit] = await Promise.all([
    getCustomerMachines(id),
    getCustomerRepairs(id),
    listMaintenanceServiceAuditByCustomer(id),
  ]);
  const histories = await Promise.all(repairs.map((repair) => listRepairStatusHistory(repair.id)));
  const notesPerRepair = await Promise.all(repairs.map((repair) => listRepairNotes(repair.id)));

  const timeline = repairs
    .flatMap((repair, index) =>
      histories[index].map((entry) => ({
        repairId: repair.id,
        machine: repair.machine,
        status: entry.status,
        timestamp: entry.createdAt,
        note: entry.note,
      })),
    )
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  const notes = notesPerRepair
    .flatMap((repairNotes, index) =>
      repairNotes.map((note) => ({
        repairId: repairs[index].id,
        machine: repairs[index].machine,
        note: note.note,
        createdAt: note.createdAt,
      })),
    )
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Klantkaart</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#111111]">{customer.name}</h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{customer.customerNumber ?? 'Klantnummer volgt'}</p>
            <p className="mt-3 text-sm text-slate-600">Volledige klantinformatie, gekoppelde machines en reparatiehistorie.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/klanten?edit=${encodeURIComponent(customer.id)}`} className="rounded-[16px] border border-[#D4AF37] bg-[#fff8e1] px-4 py-2 text-sm font-semibold text-[#111111]">
              Klant bewerken
            </Link>
            <Link href="/klanten" className="rounded-[16px] border border-slate-200 px-4 py-2 text-sm font-semibold text-[#111111]">
              Terug naar klanten
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Contact</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Voornaam</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{customer.firstName ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Achternaam</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{customer.lastName ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Adres</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{customer.address ?? customer.city ?? 'Nog niet ingevuld'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Mobiel</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{customer.mobilePhone ?? customer.phone ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Vast nummer</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{customer.landlinePhone ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">E-mail</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{customer.email ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Postcode</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{customer.postalCode ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Stad</p>
                <p className="mt-1 text-base font-semibold text-[#111111]">{customer.city ?? '-'}</p>
              </div>
            </div>
            {customer.notes ? (
              <div className="mt-4 rounded-[16px] bg-[#F8F8F8] p-4">
                <p className="text-sm text-slate-500">Notities</p>
                <p className="mt-1 text-sm text-slate-700">{customer.notes}</p>
              </div>
            ) : null}

            <div className="mt-4 rounded-[16px] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-[#111111]">Gratis onderhoudsservice</p>
              <div className="mt-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Status:</span>{' '}
                  {customer.maintenanceReminderOptIn ? 'Actief' : 'Niet actief'}
                </p>
                {customer.maintenanceReminderOptIn ? (
                  <p className="mt-1">
                    <span className="font-semibold text-slate-900">Volgende onderhoudsherinnering:</span>{' '}
                    {formatServiceDate(customer.nextMaintenanceReminderDate)}
                  </p>
                ) : null}
                <p className="mt-1">
                  <span className="font-semibold text-slate-900">Consent vastgelegd:</span>{' '}
                  {formatServiceDatetime(customer.maintenanceConsentDate)}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-slate-900">Methode:</span>{' '}
                  {customer.maintenanceConsentMethod || '-'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-slate-900">Vastgelegd door:</span>{' '}
                  {customer.maintenanceConsentEmployee || '-'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-slate-900">Laatste wijziging:</span>{' '}
                  {formatServiceDatetime(customer.maintenanceLastModified)}
                </p>
                {!customer.maintenanceReminderOptIn && customer.maintenanceUnsubscribedAt ? (
                  <p className="mt-1">
                    <span className="font-semibold text-slate-900">Afgemeld op:</span>{' '}
                    {formatServiceDatetime(customer.maintenanceUnsubscribedAt)}
                  </p>
                ) : null}
                {!customer.maintenanceReminderOptIn && customer.maintenanceUnsubscribeReason ? (
                  <p className="mt-1">
                    <span className="font-semibold text-slate-900">Reden afmelding:</span>{' '}
                    {customer.maintenanceUnsubscribeReason}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Overzicht</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[16px] bg-[#F8F8F8] p-4">
                <p className="text-sm text-slate-500">Machines</p>
                <p className="mt-2 text-3xl font-semibold text-[#111111]">{machines.length}</p>
              </div>
              <div className="rounded-[16px] bg-[#F8F8F8] p-4">
                <p className="text-sm text-slate-500">Reparaties</p>
                <p className="mt-2 text-3xl font-semibold text-[#111111]">{repairs.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <CommunicationBlock
          customerId={customer.id}
          customerName={customer.name}
          title="COMMUNICATIE"
          showComposer={false}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <ServicePreferencesCard
            customerId={customer.id}
            initialOptIn={Boolean(customer.maintenanceReminderOptIn)}
            initialNextReminderDate={customer.nextMaintenanceReminderDate}
          />

          <Card>
            <h2 className="text-xl font-semibold text-[#111111]">Machines</h2>
            <div className="mt-4 space-y-3">
              {machines.map((machine) => (
                <div key={machine.id} className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-[#111111]">{machine.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{machine.brand ?? '-'} {machine.model ?? ''}</p>
                  <p className="mt-1 text-xs text-slate-500">Serienummer: {machine.serialNumber ?? '-'}</p>
                </div>
              ))}
              {!machines.length && <p className="text-sm text-slate-500">Nog geen machines gekoppeld.</p>}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-[#111111]">Laatste notities</h2>
            <div className="mt-4 space-y-3">
              {notes.slice(0, 8).map((note) => (
                <div key={`${note.repairId}-${note.createdAt}-${note.note}`} className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-[#111111]">{note.machine}</p>
                  <p className="mt-1 text-sm text-slate-600">{note.note}</p>
                  <p className="mt-1 text-xs text-slate-500">Reparatie {note.repairId} · {note.createdAt}</p>
                </div>
              ))}
              {!notes.length && <p className="text-sm text-slate-500">Nog geen notities gevonden.</p>}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-[#111111]">Service tijdlijn</h2>
            <div className="mt-4 space-y-3">
              {maintenanceAudit.map((entry) => (
                <div key={entry.id} className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-[#111111]">{entry.eventType}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatServiceDatetime(entry.createdAt)} · {entry.actorName || 'Onbekend'} {entry.actorRole ? `(${entry.actorRole})` : ''}</p>
                  {entry.note ? <p className="mt-2 text-sm text-slate-700">{entry.note}</p> : null}
                  {entry.reason ? <p className="mt-1 text-xs text-slate-500">Reden: {entry.reason}</p> : null}
                </div>
              ))}
              {!maintenanceAudit.length && <p className="text-sm text-slate-500">Nog geen servicewijzigingen geregistreerd.</p>}
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-[#111111]">Volledige reparatiehistorie</h2>
          <div className="mt-4 space-y-4">
            {repairs.map((repair, index) => (
              <div key={repair.id} className="rounded-[16px] border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">{repair.id} · {repair.machine}</p>
                    <p className="text-sm text-slate-600">Status: {repair.status}</p>
                  </div>
                  <p className="text-sm text-slate-500">{repair.date}</p>
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                  {histories[index].map((entry) => (
                    <div key={`${repair.id}-${entry.createdAt}-${entry.status}`} className="flex flex-col gap-1 text-sm md:flex-row md:items-center md:justify-between">
                      <p className="font-medium text-[#111111]">{entry.status}</p>
                      <p className="text-slate-500">{entry.createdAt} · {entry.userName ?? 'Onbekend'} {entry.note ? `· ${entry.note}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!repairs.length && <p className="text-sm text-slate-500">Nog geen reparaties gevonden.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-[#111111]">Tijdlijn</h2>
          <div className="mt-4 space-y-3">
            {timeline.map((entry) => (
              <div key={`${entry.repairId}-${entry.timestamp}-${entry.status}`} className="rounded-[16px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-[#111111]">{entry.status}</p>
                <p className="mt-1 text-sm text-slate-600">Reparatie {entry.repairId} · {entry.machine}</p>
                <p className="mt-1 text-xs text-slate-500">{entry.timestamp}{entry.note ? ` · ${entry.note}` : ''}</p>
              </div>
            ))}
            {!timeline.length && <p className="text-sm text-slate-500">Nog geen statuswijzigingen gevonden.</p>}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
