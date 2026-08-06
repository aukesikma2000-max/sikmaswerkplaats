'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getActorHeaders } from '@/lib/client/request-actor';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repairNumber = searchParams?.get('repair') ?? 'R-2026-00001';
  const customerName = searchParams?.get('customer') ?? 'Onbekende klant';
  const customerId = searchParams?.get('customerId') ?? '';
  const phone = searchParams?.get('phone') ?? '';
  const email = searchParams?.get('email') ?? '';
  const city = searchParams?.get('city') ?? '';
  const chainIndex = Number(searchParams?.get('chainIndex') ?? '0') || 0;
  const autoPrintFailed = searchParams?.get('print') === 'failed';
  const autoPrintError = searchParams?.get('printError') ?? '';

  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isReprinting, setIsReprinting] = useState(false);
  const [reprintMessage, setReprintMessage] = useState('');
  const hasSentConversionEventRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sequenceSuffix = useMemo(() => {
    if (chainIndex <= 0) return '';
    const alphabetIndex = Math.min(chainIndex, 25);
    return String.fromCharCode(65 + alphabetIndex);
  }, [chainIndex]);

  const stopAutoReturn = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      router.push('/dashboard');
    }, 30_000);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => {
      stopAutoReturn();
    };
  }, [router]);

  useEffect(() => {
    if (hasSentConversionEventRef.current) return;
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    window.gtag('event', 'conversion', {
      send_to: 'AW-16907390289/__GhCNLqzKsaENGaif4-',
    });
    hasSentConversionEventRef.current = true;
  }, []);

  const goToDashboard = () => {
    stopAutoReturn();
    router.push('/dashboard');
  };

  const handleAddAnotherMachine = () => {
    stopAutoReturn();
    const nextParams = new URLSearchParams({
      customer: customerName,
      customerId,
      phone,
      email,
      city,
      chainIndex: String(chainIndex + 1),
    });
    router.push(`/nieuwe-reparatie?${nextParams.toString()}`);
  };

  const handleReprint = async () => {
    if (isReprinting) return;

    stopAutoReturn();
    setReprintMessage('');
    setIsReprinting(true);

    try {
      const response = await fetch('/api/labels/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getActorHeaders(),
        },
        body: JSON.stringify({ repairId: repairNumber, reason: 'REPRINT' }),
      });
      const payload = await response.json().catch(() => ({ ok: false }));

      if (!response.ok || payload?.ok !== true) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Sticker opnieuw afdrukken is mislukt.');
      }

      setReprintMessage('Sticker opnieuw verstuurd naar de printer.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sticker opnieuw afdrukken is mislukt.';
      setReprintMessage(message);
    } finally {
      setIsReprinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] p-4 lg:p-6">
      <div className="mx-auto flex max-w-4xl items-center justify-center">
        <Card className="w-full max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Reparatie opgeslagen</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#111111]">Dossier aangemaakt</h1>
          <p className="mt-3 text-base text-slate-600">De sticker is automatisch afgedrukt. Plak deze op de machine voordat deze naar de werkplaats gaat.</p>

          {autoPrintFailed ? (
            <div className="mt-5 rounded-[14px] border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700">
              <p className="font-semibold">Automatisch afdrukken is mislukt.</p>
              <p className="mt-1">Gebruik de knop voor herafdrukken. {autoPrintError || 'Controleer of de printer online is.'}</p>
              <p className="mt-2">Fallback: noteer reparatienummer en klantnaam tijdelijk met pen en papier op de machine.</p>
            </div>
          ) : null}

          <div className="mt-6 rounded-[16px] border border-[#D4AF37] bg-[#FFF8E0] p-6 text-left">
            <p className="text-sm text-slate-600">Sticker</p>
            <p className="mt-2 text-2xl font-semibold tracking-[0.08em] text-[#111111]">{repairNumber}{sequenceSuffix ? `-${sequenceSuffix}` : ''}</p>
            <p className="mt-1 text-lg text-slate-800">{customerName}</p>
          </div>

          {reprintMessage ? (
            <p className="mt-4 text-sm text-slate-700">{reprintMessage}</p>
          ) : null}

          <div className="mt-8 space-y-3">
            <Button variant="secondary" onClick={handleReprint} disabled={isReprinting}>
              {isReprinting ? 'Sticker opnieuw versturen...' : '🖨️ Sticker opnieuw afdrukken'}
            </Button>
            <Button variant="ghost" onClick={handleAddAnotherMachine}>
              ➕ Nog een machine toevoegen
            </Button>
            <Button variant="primary" onClick={goToDashboard}>
              🏠 Naar dashboard
            </Button>
          </div>

          <p className="mt-5 text-xs uppercase tracking-[0.14em] text-slate-500">Automatisch terug naar dashboard over {secondsLeft}s</p>
        </Card>
      </div>
    </div>
  );
}

export default function NieuweReparatieSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F8F8] p-4 lg:p-6" />}> 
      <SuccessContent />
    </Suspense>
  );
}
