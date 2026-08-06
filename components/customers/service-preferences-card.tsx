'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { updateMaintenanceServicePreferences } from '@/lib/repair-service';

type ServicePreferencesCardProps = {
  customerId: string;
  initialOptIn: boolean;
  initialNextReminderDate?: string;
};

function toInputDate(value?: string) {
  if (!value) return '';

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const nlMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!nlMatch) return '';
  return `${nlMatch[3]}-${nlMatch[2].padStart(2, '0')}-${nlMatch[1].padStart(2, '0')}`;
}

function toDisplayDate(value?: string) {
  if (!value) return '-';
  const inputDate = toInputDate(value);
  if (!inputDate) return value;
  const [year, month, day] = inputDate.split('-');
  return `${day}-${month}-${year}`;
}

export function ServicePreferencesCard({ customerId, initialOptIn, initialNextReminderDate }: ServicePreferencesCardProps) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [nextReminderDate, setNextReminderDate] = useState(toInputDate(initialNextReminderDate));
  const [savedOptIn, setSavedOptIn] = useState(initialOptIn);
  const [savedNextReminderDate, setSavedNextReminderDate] = useState(toInputDate(initialNextReminderDate));
  const [unsubscribeReason, setUnsubscribeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const hasChanges = useMemo(() => {
    return optIn !== savedOptIn || nextReminderDate !== savedNextReminderDate || (!optIn && Boolean(unsubscribeReason.trim()));
  }, [optIn, nextReminderDate, savedOptIn, savedNextReminderDate, unsubscribeReason]);

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage('');
    setMessage('');

    try {
      await updateMaintenanceServicePreferences({
        customerId,
        maintenanceReminderOptIn: optIn,
        nextMaintenanceReminderDate: optIn ? (nextReminderDate || undefined) : undefined,
        reason: !optIn ? unsubscribeReason : undefined,
        source: 'CUSTOMER_DOSSIER',
      });
      setMessage('Servicevoorkeuren opgeslagen.');
      setSavedOptIn(optIn);
      setSavedNextReminderDate(nextReminderDate);
      if (optIn) {
        setUnsubscribeReason('');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Opslaan mislukt.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Servicevoorkeuren</p>
      <div className="mt-4 space-y-3 text-sm text-slate-700">
        <p>
          <span className="font-semibold text-[#111111]">Onderhoudsherinnering:</span> {optIn ? 'Ja' : 'Nee'}
        </p>
        <label className="inline-flex items-center gap-2 font-semibold text-[#111111]">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(event) => {
              setOptIn(event.target.checked);
              if (event.target.checked) {
                setUnsubscribeReason('');
              }
            }}
            className="h-4 w-4"
          />
          Onderhoudsherinnering toestaan
        </label>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Volgende onderhoudsherinnering</p>
          <input
            type="date"
            value={nextReminderDate}
            onChange={(event) => setNextReminderDate(event.target.value)}
            disabled={!optIn}
            className="mt-1 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-[#111111] disabled:bg-slate-100 disabled:text-slate-400"
          />
          <p className="mt-1 text-xs text-slate-500">Huidige waarde: {toDisplayDate(initialNextReminderDate)}</p>
        </div>

        {!optIn ? (
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reden uitschrijven (optioneel)</p>
            <input
              type="text"
              value={unsubscribeReason}
              onChange={(event) => setUnsubscribeReason(event.target.value)}
              className="mt-1 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-[#111111]"
              placeholder="Bijv. klant wenst geen herinneringen"
            />
          </div>
        ) : null}
      </div>

      {errorMessage ? <p className="mt-3 rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {message ? <p className="mt-3 rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-4">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? 'Opslaan...' : 'Servicevoorkeuren opslaan'}
        </Button>
      </div>
    </Card>
  );
}
