'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { CustomerEditorModal } from '@/components/customers/customer-editor-modal';
import type { Customer } from '@/types/repair';

type CustomerManagementProps = {
  initialCustomers: Customer[];
  initialEditId?: string | null;
  initialCreateMode?: boolean;
};

function getPrimaryPhone(customer: Customer) {
  return customer.mobilePhone ?? customer.phone ?? customer.landlinePhone ?? '-';
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M4 16.75V20h3.25L18.81 8.44l-3.25-3.25L4 16.75Zm16.71-9.04a1 1 0 0 0 0-1.42L17.71 3.3a1 1 0 0 0-1.42 0l-1.88 1.88 3.25 3.25 3.05-3.72Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CustomerManagement({ initialCustomers, initialEditId = null, initialCreateMode = false }: CustomerManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname ?? '/klanten';
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [isModalOpen, setIsModalOpen] = useState(initialCreateMode || Boolean(initialEditId));
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(initialEditId);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    if (!initialEditId && !initialCreateMode) {
      return;
    }

    if (initialEditId) {
      setEditingCustomerId(initialEditId);
    }

    if (initialCreateMode) {
      setEditingCustomerId(null);
    }

    setIsModalOpen(true);
  }, [initialCreateMode, initialCustomers, initialEditId]);

  const editingCustomer = useMemo(
    () => customers.find((customer) => customer.id === editingCustomerId) ?? null,
    [customers, editingCustomerId],
  );

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return customers;
    }

    return customers.filter((customer) => {
      const haystack = [
        customer.customerNumber,
        customer.name,
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.mobilePhone,
        customer.landlinePhone,
        customer.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [customers, deferredQuery]);

  function clearQueryParams() {
    router.replace(basePath, { scroll: false });
  }

  function openCreateModal() {
    setEditingCustomerId(null);
    setFeedback('Nieuwe klantmodus actief.');
    setIsModalOpen(true);
    clearQueryParams();
  }

  function openEditModal(customer: Customer) {
    setEditingCustomerId(customer.id);
    setFeedback('');
    setIsModalOpen(true);
    clearQueryParams();
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCustomerId(null);
    clearQueryParams();
  }

  function handleCustomerSaved(savedCustomer: Customer) {
    setCustomers((currentCustomers) => {
      const isExisting = currentCustomers.some((customer) => customer.id === savedCustomer.id);
      const nextCustomers = isExisting
        ? currentCustomers.map((customer) => (customer.id === savedCustomer.id ? savedCustomer : customer))
        : [savedCustomer, ...currentCustomers];

      return nextCustomers.sort((left, right) => left.name.localeCompare(right.name, 'nl'));
    });

    setFeedback(editingCustomerId ? 'Klant succesvol bijgewerkt.' : 'Nieuwe klant succesvol toegevoegd.');
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,#111827_0%,#1f2f59_45%,#d4af37_140%)] p-0 text-white">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-[#f2de91]">Klanten</p>
            <h1 className="mt-3 text-3xl font-semibold">Zoeken, aanmaken en bijwerken op één plek</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-100/90">
              Zoek direct op klantnaam, klant-ID, telefoonnummer of e-mail en werk bestaande klantgegevens bij via het bewerkicoon rechts in de tabel.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[18px] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-200">Totaal klanten</p>
              <p className="mt-2 text-3xl font-semibold">{customers.length}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-200">Gevonden</p>
              <p className="mt-2 text-3xl font-semibold">{filteredCustomers.length}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-3xl">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoek op naam, klant-ID, telefoonnummer of e-mail"
              className="w-full rounded-[18px] border border-slate-200 bg-[#f7f7fb] py-4 pl-11 pr-14 text-base text-slate-900 outline-none transition focus:border-[#D4AF37]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-600"
              >
                Wis
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#111111] shadow-[0_8px_20px_rgba(17,17,17,0.05)] transition hover:border-[#D4AF37]"
          >
            <span className="text-lg leading-none">＋</span>
            Nieuwe klant toevoegen
          </button>
        </div>

        {feedback ? <p className="mt-4 text-sm font-medium text-emerald-700">{feedback}</p> : null}

        <div className="mt-5 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f4f8] text-slate-700">
                <tr>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">Voornaam</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">Achternaam</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">E-mail</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">Telefoonnummer</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.18em]">Klant-ID</th>
                  <th className="px-5 py-4 text-right font-semibold uppercase tracking-[0.18em]">Actie</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-100">
                    <td className="px-5 py-4 text-slate-800">{customer.firstName ?? '-'}</td>
                    <td className="px-5 py-4 text-slate-800">{customer.lastName ?? '-'}</td>
                    <td className="px-5 py-4 text-slate-600">{customer.email ?? '-'}</td>
                    <td className="px-5 py-4 text-slate-600">{getPrimaryPhone(customer)}</td>
                    <td className="px-5 py-4 font-semibold text-[#1f2f59]">{customer.customerNumber ?? 'Volgt automatisch'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(customer)}
                          aria-label={`Bewerk klant ${customer.name}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-[#D4AF37] hover:text-[#1f2f59]"
                        >
                          <PencilIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredCustomers.length ? (
            <div className="border-t border-slate-100 px-5 py-10 text-center">
              <p className="text-base font-semibold text-[#111111]">Geen klanten gevonden</p>
              <p className="mt-2 text-sm text-slate-600">Pas je zoekopdracht aan of voeg direct een nieuwe klant toe.</p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-slate-500">Deze klanten zijn gekoppeld aan jullie werkplaatsomgeving. Klant-ID wordt automatisch aangemaakt als unieke code.</p>
      </Card>

      <CustomerEditorModal
        open={isModalOpen}
        customer={editingCustomer}
        onClose={closeModal}
        onSaved={handleCustomerSaved}
      />
    </div>
  );
}