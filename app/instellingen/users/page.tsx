"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { canAccessRoute } from '@/lib/access-control';
import {
  createWorkshopUser,
  DEFAULT_WORKSHOP_USER,
  getActiveWorkshopUserRecord,
  getWorkshopUsers,
  resetWorkshopUserPassword,
  type WorkshopUser,
  type WorkshopUserRole,
  updateWorkshopUser,
} from '@/lib/active-user';

const ROLES: WorkshopUserRole[] = ['Administrator', 'Repair Technician', 'Front Desk'];

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: WorkshopUserRole;
  active: boolean;
};

const EMPTY_FORM: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'Front Desk',
  active: true,
};

export default function SettingsUsersPage() {
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string>('');

  const canManageUsers = canAccessRoute(activeUser.role, '/instellingen/users');

  useEffect(() => {
    const syncState = () => {
      setActiveUser(getActiveWorkshopUserRecord());
      setUsers(getWorkshopUsers());
    };

    syncState();

    window.addEventListener('sikma-active-user-changed', syncState as EventListener);
    window.addEventListener('sikma-users-changed', syncState as EventListener);

    return () => {
      window.removeEventListener('sikma-active-user-changed', syncState as EventListener);
      window.removeEventListener('sikma-users-changed', syncState as EventListener);
    };
  }, []);

  const editingUser = useMemo(() => users.find((user) => user.id === editUserId) ?? null, [users, editUserId]);

  useEffect(() => {
    if (!editingUser) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: editingUser.name,
      email: editingUser.email,
      password: editingUser.password,
      role: editingUser.role,
      active: editingUser.active,
    });
  }, [editingUser]);

  if (!canManageUsers) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Geen toegang</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Users management is alleen voor Administrator</h1>
          <p className="mt-3 text-sm text-slate-600">Je kunt wel terug naar Instellingen.</p>
          <div className="mt-4">
            <Link href="/instellingen" className="inline-flex rounded-[14px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111111]">
              Terug naar Instellingen
            </Link>
          </div>
        </Card>
      </PageShell>
    );
  }

  const onSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormMessage('Naam en e-mail zijn verplicht.');
      return;
    }

    if (editUserId) {
      updateWorkshopUser(editUserId, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password || (editingUser?.password ?? 'Welkom123!'),
        role: form.role,
        active: form.active,
      });
      setFormMessage('Gebruiker bijgewerkt.');
    } else {
      createWorkshopUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password || 'Welkom123!',
        role: form.role,
        active: form.active,
      });
      setFormMessage('Nieuwe gebruiker toegevoegd.');
    }

    setEditUserId(null);
    setForm(EMPTY_FORM);
    setUsers(getWorkshopUsers());
  };

  return (
    <PageShell>
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Instellingen / Users</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Gebruikersbeheer</h1>
              <p className="mt-2 text-sm text-slate-600">Alleen Administrator kan gebruikers beheren.</p>
            </div>
            <Link href="/instellingen" className="inline-flex rounded-[14px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111111]">
              Terug
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-[#111111]">{editUserId ? 'Gebruiker bewerken' : 'Nieuwe gebruiker'}</h2>
            <button
              onClick={() => {
                setEditUserId(null);
                setForm(EMPTY_FORM);
                setFormMessage('Nieuwe gebruiker modus actief.');
              }}
              className="rounded-[10px] border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#111111]"
            >
              Nieuwe gebruiker
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Naam
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-[12px] border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              E-mail
              <input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-[12px] border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Wachtwoord
              <input
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="mt-1 w-full rounded-[12px] border border-slate-200 px-3 py-2"
              />
              {!editUserId ? <span className="mt-1 block text-xs text-slate-500">Leeg laten = standaard Welkom123!</span> : null}
            </label>
            <label className="text-sm text-slate-700">
              Rol
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as WorkshopUserRole }))}
                className="mt-1 w-full rounded-[12px] border border-slate-200 px-3 py-2"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Actief
          </label>

          <div className="mt-4 flex gap-3">
            <button onClick={onSave} className="rounded-[12px] bg-[#111111] px-4 py-2 text-sm font-semibold text-white">
              {editUserId ? 'Opslaan' : 'Toevoegen'}
            </button>
            {editUserId ? (
              <button
                onClick={() => {
                  setEditUserId(null);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-[12px] border border-slate-300 px-4 py-2 text-sm font-semibold text-[#111111]"
              >
                Annuleren
              </button>
            ) : null}
          </div>

          {formMessage ? <p className="mt-3 text-sm text-slate-600">{formMessage}</p> : null}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-[#111111]">Gebruikers</h2>
          <div className="mt-4 space-y-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-[14px] border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[#111111]">{user.name}</p>
                    <p className="text-sm text-slate-600">{user.email}</p>
                    <p className="text-sm text-slate-600">{user.role}</p>
                    <p className="text-xs text-slate-500">{user.active ? 'Actief' : 'Inactief'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditUserId(user.id)}
                      className="rounded-[10px] border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#111111]"
                    >
                      Bewerk
                    </button>
                    <button
                      onClick={() => updateWorkshopUser(user.id, { active: !user.active })}
                      className="rounded-[10px] border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#111111]"
                    >
                      {user.active ? 'Deactiveer' : 'Activeer'}
                    </button>
                    <button
                      onClick={() => {
                        const tempPassword = 'Welkom123!';
                        resetWorkshopUserPassword(user.id, tempPassword);
                      }}
                      className="rounded-[10px] border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#111111]"
                    >
                      Reset wachtwoord
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
