'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GlobalRepairSearch } from '@/components/global-repair-search';
import {
  clearActiveWorkshopUser,
  DEFAULT_WORKSHOP_USER,
  getActiveWorkshopUserRecord,
  getActiveWorkshopUsers,
  setActiveWorkshopUser,
  type WorkshopUser,
} from '@/lib/active-user';
import { getActorHeaders } from '@/lib/client/request-actor';
import { WORKSHOP_NAME } from '@/lib/workshop-info';

function roleLabel(role: WorkshopUser['role']) {
  if (role === 'Front Desk') return 'Balie';
  if (role === 'Repair Technician') return 'Reparateur';
  return 'Administrator';
}

function roleIcon(role: WorkshopUser['role']) {
  if (role === 'Front Desk') return '👤';
  if (role === 'Repair Technician') return '🔧';
  return '⭐';
}

export function FrontDeskHeader() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);
  const [availableUsers, setAvailableUsers] = useState<WorkshopUser[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [printerState, setPrinterState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [printerMessage, setPrinterMessage] = useState('');

  useEffect(() => {
    const syncUsers = () => {
      setActiveUser(getActiveWorkshopUserRecord());
      setAvailableUsers(getActiveWorkshopUsers());
    };

    syncUsers();
    window.addEventListener('sikma-active-user-changed', syncUsers as EventListener);
    window.addEventListener('sikma-users-changed', syncUsers as EventListener);

    return () => {
      window.removeEventListener('sikma-active-user-changed', syncUsers as EventListener);
      window.removeEventListener('sikma-users-changed', syncUsers as EventListener);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const userCards = useMemo(
    () =>
      availableUsers.map((user) => ({
        ...user,
        icon: roleIcon(user.role),
        roleText: roleLabel(user.role),
      })),
    [availableUsers],
  );

  const handlePrinterCheck = async () => {
    if (printerState === 'testing') return;

    setPrinterState('testing');
    setPrinterMessage('Printer controleren...');

    try {
      const response = await fetch('/api/labels/printer-test', {
        method: 'POST',
        headers: getActorHeaders(),
      });
      const payload = await response.json().catch(() => ({ ok: false }));

      if (!response.ok || payload?.ok !== true) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Printercontrole mislukt.');
      }

      setPrinterState('ok');
      setPrinterMessage(`Printer online (${payload.printerTarget ?? 'onbekend'}).`);
    } catch (error) {
      setPrinterState('error');
      setPrinterMessage(error instanceof Error ? error.message : 'Printercontrole mislukt.');
    }
  };

  const handleLogout = () => {
    setMenuOpen(false);
    setSwitcherOpen(false);
    clearActiveWorkshopUser();
    router.replace('/');
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#111111] text-white">
        <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center gap-3 px-4 lg:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-[12px] px-2 py-1 transition hover:bg-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white p-1.5">
              <Image src="/logo.png" alt="Logo Sikma's Werkplaats" width={38} height={38} className="h-[38px] w-[38px] object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-base font-semibold text-white">{WORKSHOP_NAME}</p>
            </div>
          </Link>

          <div className="mx-auto w-full max-w-3xl">
            <GlobalRepairSearch
              placeholder="Zoek klantnaam, telefoon, reparatienummer, merk of model"
              autoOpenSingleResult
              className="text-white"
              inputWrapperClassName="rounded-[14px] border border-white/20 bg-white/10 px-4 py-3 shadow-none"
              inputClassName="text-base font-medium text-white placeholder:text-slate-300"
              dropdownClassName="mt-2 rounded-[14px] border border-slate-200 bg-white p-2 text-[#111111] shadow-[0_16px_30px_rgba(17,17,17,0.2)]"
            />
          </div>

          <div ref={dropdownRef} className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-[12px] border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <span>👤 {activeUser.name}</span>
              <span aria-hidden>▼</span>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-[14px] border border-slate-200 bg-white p-2 text-[#111111] shadow-[0_16px_30px_rgba(17,17,17,0.2)]">
                <p className="rounded-[10px] px-3 py-2 text-sm text-slate-600">👤 Ingelogd als: {activeUser.name}</p>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSwitcherOpen(true);
                  }}
                  className="mt-1 block w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100"
                >
                  🔄 Gebruiker wisselen
                </button>

                <button
                  type="button"
                  onClick={handlePrinterCheck}
                  className="mt-1 block w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100"
                >
                  🖨 Printer controleren
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 block w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-100"
                >
                  🚪 Afmelden
                </button>

                {printerState !== 'idle' ? (
                  <p className={`mt-2 rounded-[10px] px-3 py-2 text-xs ${printerState === 'ok' ? 'bg-emerald-50 text-emerald-700' : printerState === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                    {printerMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {switcherOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 p-4" onClick={() => setSwitcherOpen(false)}>
          <div
            className="w-full max-w-3xl rounded-[16px] bg-white p-5 shadow-[0_24px_60px_rgba(17,17,17,0.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#D4AF37]">Gebruiker wisselen</p>
                <h2 className="mt-1 text-xl font-semibold text-[#111111]">Kies actieve gebruiker</h2>
              </div>
              <button
                type="button"
                onClick={() => setSwitcherOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-xl text-slate-600 transition hover:border-[#D4AF37]"
                aria-label="Sluiten"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {userCards.map((user) => {
                const selected = user.id === activeUser.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setActiveWorkshopUser(user.id);
                      setSwitcherOpen(false);
                    }}
                    className={`rounded-[14px] border p-4 text-left transition ${selected ? 'border-[#D4AF37] bg-[#FFF9E8]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <p className="text-base font-semibold text-[#111111]">{user.icon} {user.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{user.roleText}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}