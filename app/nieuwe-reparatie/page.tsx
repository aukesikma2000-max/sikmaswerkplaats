'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { PageShell } from '@/components/ui/page-shell';
import { getActorHeaders } from '@/lib/client/request-actor';
import { addRepair, loadCustomers } from '@/lib/repair-service';
import type { Customer } from '@/types/repair';
import { detectPossibleDuplicateIntake } from '@/lib/repair-intake-dedupe';

export default function NieuweReparatiePage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [landlinePhone, setLandlinePhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [chainIndex, setChainIndex] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const customer = params.get('customer') ?? '';
    const customerId = params.get('customerId') ?? '';
    const phone = params.get('phone') ?? '';
    const customerEmail = params.get('email') ?? '';
    const customerCity = params.get('city') ?? '';
    const parsedChainIndex = Number(params.get('chainIndex') ?? '0');

    if (customer) setName(customer);
    if (customerId) setSelectedCustomerId(customerId);
    if (phone) setMobilePhone(phone);
    if (customerEmail) setEmail(customerEmail);
    if (customerCity) setCity(customerCity);
    if (Number.isFinite(parsedChainIndex) && parsedChainIndex >= 0) {
      setChainIndex(Math.floor(parsedChainIndex));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const c = await loadCustomers();
        if (!mounted) return;
        setCustomers(c ?? []);
      } catch (err) {
        console.error(err);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const customerSuggestions = useMemo(() => {
    const query = name.trim().toLowerCase();
    if (query.length < 2) return [];

    const uniqueById = new Map<string, Customer>();
    for (const customer of customers) {
      if (!customer.id) continue;
      uniqueById.set(customer.id, customer);
    }

    return Array.from(uniqueById.values())
      .filter((customer) => {
        const haystack = [customer.name, customer.phone, customer.email, customer.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);
  }, [customers, name]);

  const contactChecks = useMemo(
    () => [
      {
        label: mobilePhone.trim() || landlinePhone.trim() ? 'Telefoonnummer ingevuld' : 'Telefoonnummer ontbreekt',
        complete: Boolean(mobilePhone.trim() || landlinePhone.trim()),
      },
      {
        label: email.trim() ? 'E-mail ingevuld' : 'E-mail ontbreekt',
        complete: Boolean(email.trim()),
      },
    ],
    [email, landlinePhone, mobilePhone]
  );

  const duplicateWarning = useMemo(() => {
    const normalizedName = name.trim().toLowerCase();
    const normalizedPhone = (mobilePhone.trim() || landlinePhone.trim()).toLowerCase();
    const normalizedSerial = serialNumber.trim().toLowerCase();
    const normalizedIssue = description.trim().toLowerCase();

    if (!normalizedName || (!normalizedPhone && !normalizedSerial)) {
      return null;
    }

    const matches = customers.filter((customer) => {
      const sameName = (customer.name || '').toLowerCase() === normalizedName;
      const samePhone = normalizedPhone && (customer.phone || '').toLowerCase() === normalizedPhone;
      return sameName || samePhone;
    });

    if (!matches.length) return null;

    if (!normalizedSerial && normalizedIssue.length < 6) {
      return `Mogelijke dubbele intake voor ${matches[0].name}. Controleer bestaand dossier voordat je opslaat.`;
    }

    const result = detectPossibleDuplicateIntake({
      customerName: name,
      primaryPhone: mobilePhone.trim() || landlinePhone.trim(),
      serialNumber,
      customers,
    });

    return result.hasWarning ? result.message : null;
  }, [customers, description, landlinePhone, mobilePhone, name, serialNumber]);

  const selectCustomer = (customer: Customer) => {
    setName(customer.name ?? '');
    setMobilePhone(customer.phone ?? '');
    setEmail(customer.email ?? '');
    setCity(customer.city ?? '');
    setSelectedCustomerId(customer.id);
    setShowCustomerSuggestions(false);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError('');

    const trimmedName = name.trim();
    const trimmedMobile = mobilePhone.trim();
    const trimmedLandline = landlinePhone.trim();
    const primaryPhone = trimmedMobile || trimmedLandline;
    const trimmedDescription = description.trim();
    const trimmedBrand = brand.trim();
    const trimmedModel = model.trim();
    const trimmedSerialNumber = serialNumber.trim();

    if (!trimmedDescription || !trimmedName) {
      setSaveError('Vul minimaal omschrijving en naam klant in.');
      return;
    }

    setIsSaving(true);
    try {
      const repair = await addRepair({
        existingCustomerId: selectedCustomerId.trim() || undefined,
        customer: trimmedName,
        phone: primaryPhone,
        email: email.trim(),
        city: city.trim(),
        brand: trimmedBrand || undefined,
        model: trimmedModel || undefined,
        serialNumber: trimmedSerialNumber || undefined,
        issue: trimmedDescription,
        repair: '',
        notes: [
          notes.trim(),
          trimmedLandline ? `Vast: ${trimmedLandline}` : '',
        ].filter(Boolean).join('\n'),
        price: 0,
      });

      if (!repair?.id) {
        throw new Error('Reparatie kon niet worden opgeslagen. Geen reparatienummer ontvangen.');
      }

      let printStatus: 'ok' | 'failed' = 'ok';
      let printError = '';

      try {
        const response = await fetch('/api/labels/print', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getActorHeaders(),
          },
          body: JSON.stringify({ repairId: repair.id, reason: 'AUTO' }),
        });

        const payload = await response.json().catch(() => ({ ok: false }));
        if (!response.ok || payload?.ok !== true) {
          printStatus = 'failed';
          printError = typeof payload?.error === 'string' ? payload.error : 'Sticker kon niet automatisch worden afgedrukt.';
        }
      } catch (error) {
        printStatus = 'failed';
        printError = error instanceof Error ? error.message : 'Sticker kon niet automatisch worden afgedrukt.';
      }

      const nextParams = new URLSearchParams({
        repair: repair.id,
        customer: trimmedName,
        phone: primaryPhone,
        email: email.trim(),
        city: city.trim(),
        customerId: repair.customerId ?? selectedCustomerId.trim(),
        chainIndex: String(chainIndex),
        print: printStatus,
      });

      if (printError) {
        nextParams.set('printError', printError);
      }

      router.push(`/nieuwe-reparatie/succes?${nextParams.toString()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Opslaan is mislukt. Controleer de verbinding en probeer opnieuw.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageShell>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <h3 className="text-xl font-semibold text-[#111111]">Balie intake</h3>
          <p className="mt-2 text-sm italic text-slate-600">Volg het gesprek met de klant. Alleen invullen wat nu nodig is.</p>
          {chainIndex > 0 ? (
            <div className="mt-3 inline-flex rounded-full border border-[#D4AF37] bg-[#FFF8E0] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#7A5B00]">
              Zelfde klantreeks: dossier {String.fromCharCode(65 + Math.min(chainIndex, 25))}
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            <FormField label="Omschrijving" value={description} onChange={setDescription} placeholder="Beschrijf het probleem van de machine" multiline required />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Naam klant</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSelectedCustomerId('');
                    setShowCustomerSuggestions(true);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setShowCustomerSuggestions(false), 120);
                  }}
                  placeholder="Begin met typen om bestaande klanten te vinden"
                  className="w-full rounded-[16px] border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none focus:border-[#D4AF37]"
                />

                {showCustomerSuggestions && customerSuggestions.length > 0 ? (
                  <div className="absolute z-20 mt-2 w-full rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_12px_28px_rgba(17,17,17,0.10)]">
                    {customerSuggestions.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectCustomer(customer);
                        }}
                        className="w-full rounded-[10px] px-3 py-2 text-left transition hover:bg-[#F8F8F8]"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{customer.customerNumber ?? 'Klantnummer volgt'}</p>
                        <p className="text-sm font-semibold text-[#111111]">{customer.name}</p>
                        <p className="text-xs text-slate-600">
                          {[customer.city, customer.phone].filter(Boolean).join(' • ') || 'Bestaande klant'}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-[#F8F8F8] p-4">
              <p className="text-sm font-semibold text-[#111111]">Contactgegevens controleren</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {contactChecks.map((check) => (
                  <div
                    key={check.label}
                    className={`rounded-[12px] border px-3 py-2 text-sm font-semibold ${
                      check.complete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {check.complete ? '✓' : '!'} {check.label}
                  </div>
                ))}
              </div>
            </div>

            {duplicateWarning ? (
              <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                ⚠ {duplicateWarning}
              </div>
            ) : null}

            <FormField label="Woonplaats" value={city} onChange={setCity} placeholder="Rotterdam" />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Mobiel" value={mobilePhone} onChange={setMobilePhone} placeholder="06 12345678" />
              <FormField label="Vast" value={landlinePhone} onChange={setLandlinePhone} placeholder="0515 123456" />
            </div>
            <FormField label="E-mailadres" value={email} onChange={setEmail} placeholder="naam@voorbeeld.nl" type="email" />
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Merk" value={brand} onChange={setBrand} placeholder="Pfaff" />
              <FormField label="Type" value={model} onChange={setModel} placeholder="Creative 4.5" />
              <FormField label="Serienummer" value={serialNumber} onChange={setSerialNumber} placeholder="SN-12345" />
            </div>
            <FormField label="Notitie voor de werkplaats" value={notes} onChange={setNotes} placeholder="Specifieke informatie voor de monteur" multiline />
          </div>

          <div className="mt-6">
            {saveError ? <p className="mb-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p> : null}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Opslaan en sticker afdrukken...' : 'OPSLAAN'}
            </Button>
          </div>
        </Card>

        <Card className="bg-white text-[#111111]">
          <h3 className="text-xl font-semibold">U kunt het volgende van ons verwachten</h3>
          <p className="mt-2 text-sm text-slate-600">En natuurlijk kunt u altijd contact opnemen voor eventuele vragen over de naaimachinereparatie.</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-[16px] border border-slate-200 bg-[#F8F8F8] p-4">
              <p className="text-sm font-semibold text-[#111111]">Doorlooptijd</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Ons streven is dat u uw machine binnen 1 week weer kunt ophalen.</p>
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-[#F8F8F8] p-4">
              <p className="text-sm font-semibold text-[#111111]">Merken</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Wij repareren alle merken.</p>
            </div>
            <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Kosten boven €75</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">Komen de reparatiekosten boven de €75? Dan nemen wij contact met u op over passend advies en/of kostenindicatie.</p>
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-[#111111]">Na opslaan</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Er wordt automatisch een reparatienummer aangemaakt en een sticker voorbereid om te printen.</p>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
