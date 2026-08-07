'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getCurrentDate, WORKSHOP_NAME } from '@/lib/workshop-info';
import {
  DEFAULT_WORKSHOP_USER,
  getActiveWorkshopUsers,
  getActiveWorkshopUserRecord,
  getRoleForWorkshopUser,
  setActiveWorkshopUser,
  type WorkshopUser,
} from '@/lib/active-user';
import { canAccessRoute, getStartPage } from '@/lib/access-control';

// Per-rol navigatieset conform spec
const NAV_LINKS: Record<string, { href: string; label: string }[]> = {
  Administrator: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/online-aanmeldingen', label: 'Online' },
    { href: '/werkplaats', label: 'Werkplaats' },
    { href: '/klanten', label: 'Klanten' },
    { href: '/archief', label: 'Archief' },
    { href: '/instellingen', label: 'Instellingen' },
  ],
  'Repair Technician': [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/online-aanmeldingen', label: 'Online' },
    { href: '/werkplaats', label: 'Werkplaats' },
    { href: '/klanten', label: 'Klanten' },
    { href: '/archief', label: 'Archief' },
  ],
  'Front Desk': [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/online-aanmeldingen', label: 'Online' },
    { href: '/klanten', label: 'Klanten' },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);
  const [availableUsers, setAvailableUsers] = useState<WorkshopUser[]>([]);
  const activeRole = getRoleForWorkshopUser(activeUser);

  useEffect(() => {
    const users = getActiveWorkshopUsers();
    setAvailableUsers(users);

    const active = getActiveWorkshopUserRecord();
    const selected = users.find((user) => user.id === active.id) ?? DEFAULT_WORKSHOP_USER;
    setActiveUser(selected);

    const onUserChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const nextUsers = getActiveWorkshopUsers();
      setAvailableUsers(nextUsers);
      if (customEvent.detail) {
        const selectedUser = nextUsers.find((user) => user.id === customEvent.detail);
        if (selectedUser) {
          setActiveUser(selectedUser);
          return;
        }
      }

      const active = getActiveWorkshopUserRecord();
      const fallback = nextUsers.find((user) => user.id === active.id) ?? DEFAULT_WORKSHOP_USER;
      setActiveUser(fallback);
    };

    const onUsersChanged = () => {
      const nextUsers = getActiveWorkshopUsers();
      setAvailableUsers(nextUsers);
      const active = getActiveWorkshopUserRecord();
      const selectedUser = nextUsers.find((user) => user.id === active.id) ?? DEFAULT_WORKSHOP_USER;
      setActiveUser(selectedUser);
    };

    window.addEventListener('sikma-active-user-changed', onUserChange as EventListener);
    window.addEventListener('sikma-users-changed', onUsersChanged as EventListener);

    return () => {
      window.removeEventListener('sikma-active-user-changed', onUserChange as EventListener);
      window.removeEventListener('sikma-users-changed', onUsersChanged as EventListener);
    };
  }, []);

  return (
    <aside className="w-full rounded-[16px] bg-[#111111] p-5 text-white shadow-[0_10px_30px_rgba(17,17,17,0.16)] lg:sticky lg:top-4 lg:h-fit lg:w-72">
      <div className="mb-8 rounded-[16px] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-[70px] w-[70px] items-center justify-center rounded-[16px] bg-white p-2">
            <Image src="/logo.png" alt="Logo Sikma's Werkplaats" width={60} height={60} className="h-[60px] w-[60px] object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{WORKSHOP_NAME}</h1>
          </div>
        </div>

        <div className="mt-4 rounded-[16px] bg-white/5 p-4 text-sm text-slate-200">
          <p className="font-semibold text-[#D4AF37]">Gebruiker</p>
          <select
            value={activeUser.id}
            onChange={(event) => {
              const userId = event.target.value;
              const selectedUser = availableUsers.find((user) => user.id === userId);
              if (!selectedUser) return;
              setActiveUser(selectedUser);
              setActiveWorkshopUser(userId);
            }}
            className="mt-2 w-full rounded-[12px] border border-white/20 bg-black/20 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-[#D4AF37]"
          >
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id} className="text-black">
                {user.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">{getCurrentDate()}</p>
        </div>
      </div>

      <nav className="space-y-2">
        {(NAV_LINKS[activeRole] ?? NAV_LINKS['Front Desk']).map((link) => {
          const active = pathname === link.href || (link.href !== '/dashboard' && (pathname ?? '').startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between rounded-[16px] px-4 py-3 text-left text-base font-semibold transition ${
                active ? 'bg-[#D4AF37] text-[#111111]' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span>{link.label}</span>
              <span className="text-xl">›</span>
            </Link>
          );
        })}
      </nav>

      <p className="mt-4 px-2 text-xs text-slate-400">Rol: {activeRole}</p>
    </aside>
  );
}
