'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { createCustomer, updateCustomer } from '@/lib/repositories/customers';
import type { Customer, CustomerInput } from '@/types/repair';

type CustomerEditorModalProps = {
  open: boolean;
  customer?: Customer | null;
  onClose: () => void;
  onSaved?: (customer: Customer) => void;
};

type CustomerFormState = {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  mobilePhone: string;
  landlinePhone: string;
  email: string;
  notes: string;
};

type ModalTab = 'klant' | 'contact' | 'adres';

const EMPTY_FORM: CustomerFormState = {
  firstName: '',
  lastName: '',
  address: '',
  postalCode: '',
  city: '',
  mobilePhone: '',
  landlinePhone: '',
  email: '',
  notes: '',
};

const MODAL_TABS: Array<{ id: ModalTab; label: string }> = [
  { id: 'klant', label: 'Klant' },
  { id: 'contact', label: 'Contact' },
  { id: 'adres', label: 'Adres & notities' },
];

function toFormState(customer: Customer | null): CustomerFormState {
  if (!customer) return EMPTY_FORM;

  return {
    firstName: customer.firstName ?? '',
    lastName: customer.lastName ?? '',
    address: customer.address ?? '',
    postalCode: customer.postalCode ?? '',
    city: customer.city ?? '',
    mobilePhone: customer.mobilePhone ?? customer.phone ?? '',
    landlinePhone: customer.landlinePhone ?? '',
    email: customer.email ?? '',
    notes: customer.notes ?? '',
  };
}

function toCustomerInput(form: CustomerFormState): CustomerInput {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    address: form.address,
    postalCode: form.postalCode,
    city: form.city,
    mobilePhone: form.mobilePhone,
    landlinePhone: form.landlinePhone,
    phone: form.mobilePhone || form.landlinePhone,
    email: form.email,
    notes: form.notes,
  };
}

export function CustomerEditorModal({ open, customer = null, onClose, onSaved }: CustomerEditorModalProps) {
  const [form, setForm] = useState<CustomerFormState>(toFormState(customer));
  const [activeTab, setActiveTab] = useState<ModalTab>('klant');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(customer));
    setActiveTab('klant');
    setErrorMessage('');
  }, [customer, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErrorMessage('Voornaam en achternaam zijn verplicht.');
      setActiveTab('klant');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload = toCustomerInput(form);
      const savedCustomer = customer?.id
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload);

      onSaved?.(savedCustomer);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Klant kon niet worden opgeslagen.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#1f2343]/75 px-4 py-8 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[calc(100vh-4rem)] w-full max-w-5xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-[0_30px_80px_rgba(17,17,17,0.25)] md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Klantenbeheer</p>
            <h2 className="mt-2 text-3xl font-semibold text-[#111111]">{customer ? 'Klant bewerken' : 'Nieuwe klant toevoegen'}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {customer ? 'Werk alle klantgegevens bij en sla de wijzigingen direct op.' : 'Maak direct vanuit dit scherm een nieuwe klant aan.'}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <div className="rounded-full bg-[#f4f6fb] px-4 py-2 text-sm font-semibold text-[#1f2f59]">
              Klant-ID: {customer?.customerNumber ?? 'Wordt automatisch toegekend'}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-2xl text-slate-600 transition hover:border-[#D4AF37]"
              aria-label="Sluit klantvenster"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {MODAL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id ? 'bg-[#0f1743] text-white' : 'bg-[#f1f3f8] text-slate-600 hover:bg-[#e8ebf4]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {errorMessage ? <p className="mt-5 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p> : null}

        <div className="mt-6">
          {activeTab === 'klant' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Voornaam" value={form.firstName} onChange={(value) => setForm((current) => ({ ...current, firstName: value }))} required />
              <FormField label="Achternaam" value={form.lastName} onChange={(value) => setForm((current) => ({ ...current, lastName: value }))} required />
              <FormField label="E-mailadres" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} type="email" />
              <FormField label="Mobiel nummer" value={form.mobilePhone} onChange={(value) => setForm((current) => ({ ...current, mobilePhone: value }))} />
            </div>
          ) : null}

          {activeTab === 'contact' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Mobiel nummer" value={form.mobilePhone} onChange={(value) => setForm((current) => ({ ...current, mobilePhone: value }))} />
              <FormField label="Vast nummer" value={form.landlinePhone} onChange={(value) => setForm((current) => ({ ...current, landlinePhone: value }))} />
              <div className="md:col-span-2">
                <FormField label="E-mailadres" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} type="email" />
              </div>
            </div>
          ) : null}

          {activeTab === 'adres' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormField label="Adres" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
              </div>
              <FormField label="Postcode" value={form.postalCode} onChange={(value) => setForm((current) => ({ ...current, postalCode: value }))} />
              <FormField label="Plaats" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
              <div className="md:col-span-2">
                <FormField label="Notities" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} multiline />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">Verplicht: voornaam en achternaam. Klant-ID wordt automatisch beheerd.</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[16px] border border-slate-300 px-5 py-3 text-sm font-semibold text-[#111111]"
            >
              Annuleren
            </button>
            <Button onClick={handleSubmit} disabled={isSaving} className="sm:w-auto sm:min-w-[180px]">
              {isSaving ? 'Opslaan...' : customer ? 'Klant bijwerken' : 'Klant aanmaken'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}