import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Repair, PaymentStatus } from '@/types/repair';

type HandoverPanelProps = {
  repair: Repair;
  onHandover: (paymentStatus: PaymentStatus, maintenanceReminderOptIn: boolean) => void;
};

export function HandoverPanel({ repair, onHandover }: HandoverPanelProps) {
  const [maintenanceReminderOptIn, setMaintenanceReminderOptIn] = useState(false);

  useEffect(() => {
    setMaintenanceReminderOptIn(false);
  }, [repair.id]);

  return (
    <Card>
      <p className="text-sm uppercase tracking-[0.3em] text-[#D4AF37]">Uitgifteproces</p>
      <h2 className="mt-2 text-xl font-semibold text-[#111111]">Controleer voordat u aflevert</h2>

      <div className="mt-6 space-y-3 rounded-[16px] bg-[#F8F8F8] p-4 text-sm text-slate-700">
        <div>
          <p className="font-semibold text-[#111111]">Klantgegevens</p>
          <p>{repair.customer}</p>
          <p>{repair.phone}</p>
          <p>{repair.city}</p>
        </div>
        <div>
          <p className="font-semibold text-[#111111]">Machine & werkzaamheden</p>
          <p>{repair.machine}</p>
          <p>{repair.repair}</p>
        </div>
        <div>
          <p className="font-semibold text-[#111111]">Prijs</p>
          <p>€ {repair.price.toFixed(2).replace('.', ',')}</p>
        </div>
        <div>
          <p className="font-semibold text-[#111111]">Opmerkingen</p>
          <p>{repair.notes || 'Geen extra opmerkingen'}</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-600">Extra kosten worden nooit automatisch gedeeld. Maak altijd eerst een beltaak aan.</p>

      <div className="mt-6 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold text-amber-950">Gratis onderhoudsherinnering</p>
        <p className="mt-2 leading-6">
          Veel klanten vinden het prettig om een gratis onderhoudsherinnering te ontvangen. Vraag daarom aan de klant:
        </p>
        <p className="mt-2 font-semibold leading-6">
          &quot;Zullen wij u over ongeveer een jaar even een herinnering sturen wanneer uw machine waarschijnlijk weer aan onderhoud toe is?&quot;
        </p>

        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-amber-950">
          <input
            type="checkbox"
            checked={maintenanceReminderOptIn}
            onChange={(event) => setMaintenanceReminderOptIn(event.target.checked)}
            className="h-4 w-4"
          />
          Klant wil een gratis onderhoudsherinnering ontvangen
        </label>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" onClick={() => onHandover('Betaald', maintenanceReminderOptIn)}>
          Betaald
        </Button>
        <Button variant="ghost" onClick={() => onHandover('Open', maintenanceReminderOptIn)}>
          Openstaand
        </Button>
      </div>
    </Card>
  );
}
