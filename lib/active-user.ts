export type WorkshopUserRole = 'Administrator' | 'Repair Technician' | 'Front Desk';

export type WorkshopUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: WorkshopUserRole;
  active: boolean;
};

const USERS_STORAGE_KEY = 'sikma.users';
const ACTIVE_USER_STORAGE_KEY = 'sikma.activeUserId';

export const DEFAULT_WORKSHOP_USER: WorkshopUser = {
  id: 'user-a-sikma',
  name: 'A. Sikma',
  email: 'a.sikma@sikma.local',
  password: 'Welkom123!',
  role: 'Administrator',
  active: true,
};

const DEFAULT_USERS: WorkshopUser[] = [
  DEFAULT_WORKSHOP_USER,
  {
    id: 'user-k-sikma',
    name: 'K. Sikma',
    email: 'k.sikma@sikma.local',
    password: 'Welkom123!',
    role: 'Repair Technician',
    active: true,
  },
  {
    id: 'user-t-sikma',
    name: 'T. Sikma',
    email: 't.sikma@sikma.local',
    password: 'Welkom123!',
    role: 'Front Desk',
    active: true,
  },
  {
    id: 'user-mg-sikma',
    name: 'MG. Sikma',
    email: 'mg.sikma@sikma.local',
    password: 'Welkom123!',
    role: 'Front Desk',
    active: true,
  },
  {
    id: 'user-m-sikma',
    name: 'M. Sikma',
    email: 'm.sikma@sikma.local',
    password: 'Welkom123!',
    role: 'Front Desk',
    active: true,
  },
];

function cloneUsers(users: WorkshopUser[]) {
  return users.map((user) => ({ ...user }));
}

function isWorkshopUserRole(value: string): value is WorkshopUserRole {
  return value === 'Administrator' || value === 'Repair Technician' || value === 'Front Desk';
}

function sanitizeUsers(raw: unknown): WorkshopUser[] {
  if (!Array.isArray(raw)) {
    return cloneUsers(DEFAULT_USERS);
  }

  const users: WorkshopUser[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    const name = typeof record.name === 'string' ? record.name : '';
    const email = typeof record.email === 'string' ? record.email : '';
    const password = typeof record.password === 'string' ? record.password : '';
    const role = typeof record.role === 'string' && isWorkshopUserRole(record.role) ? record.role : null;
    const active = typeof record.active === 'boolean' ? record.active : true;

    if (!id || !name || !email || !password || !role) continue;

    users.push({ id, name, email, password, role, active });
  }

  if (!users.length) {
    return cloneUsers(DEFAULT_USERS);
  }

  return users;
}

function dispatchUsersChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('sikma-users-changed'));
}

function dispatchActiveUserChanged(userId: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('sikma-active-user-changed', { detail: userId }));
}

function ensureActiveUser(users: WorkshopUser[]) {
  if (typeof window === 'undefined') return;

  const storedId = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  const storedUser = users.find((user) => user.id === storedId && user.active);
  if (storedUser) return;

  const firstActive = users.find((user) => user.active) ?? DEFAULT_WORKSHOP_USER;
  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, firstActive.id);
  dispatchActiveUserChanged(firstActive.id);
}

export function getWorkshopUsers(): WorkshopUser[] {
  if (typeof window === 'undefined') {
    return cloneUsers(DEFAULT_USERS);
  }

  const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) {
    const defaults = cloneUsers(DEFAULT_USERS);
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaults));
    ensureActiveUser(defaults);
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    const users = sanitizeUsers(parsed);
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    ensureActiveUser(users);
    return users;
  } catch {
    const defaults = cloneUsers(DEFAULT_USERS);
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaults));
    ensureActiveUser(defaults);
    return defaults;
  }
}

export function saveWorkshopUsers(users: WorkshopUser[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  ensureActiveUser(users);
  dispatchUsersChanged();
}

export function getActiveWorkshopUsers(): WorkshopUser[] {
  return getWorkshopUsers().filter((user) => user.active);
}

export function getActiveWorkshopUserRecord(): WorkshopUser {
  const users = getWorkshopUsers();

  if (typeof window === 'undefined') {
    return users.find((user) => user.id === DEFAULT_WORKSHOP_USER.id) ?? DEFAULT_WORKSHOP_USER;
  }

  const storedId = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  const user = users.find((entry) => entry.id === storedId && entry.active);
  if (user) return user;

  const fallback = users.find((entry) => entry.active) ?? DEFAULT_WORKSHOP_USER;
  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, fallback.id);
  return fallback;
}

export function getActiveWorkshopUser(): string {
  return getActiveWorkshopUserRecord().name;
}

export function setActiveWorkshopUser(userId: string) {
  if (typeof window === 'undefined') return;

  const users = getWorkshopUsers();
  const selectedUser = users.find((user) => user.id === userId && user.active);
  if (!selectedUser) return;

  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, selectedUser.id);
  dispatchActiveUserChanged(selectedUser.id);
}

export function clearActiveWorkshopUser() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
  const users = getWorkshopUsers();
  const fallback = users.find((entry) => entry.active) ?? DEFAULT_WORKSHOP_USER;
  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, fallback.id);
  dispatchActiveUserChanged(fallback.id);
}

export function getRoleForWorkshopUser(user: WorkshopUser): WorkshopUserRole {
  return user.role;
}

export function getActiveWorkshopUserRole(): WorkshopUserRole {
  return getActiveWorkshopUserRecord().role;
}

export function createWorkshopUser(input: Omit<WorkshopUser, 'id'>): WorkshopUser {
  const users = getWorkshopUsers();
  const user: WorkshopUser = {
    ...input,
    id: `user-${crypto.randomUUID()}`,
  };
  saveWorkshopUsers([...users, user]);
  return user;
}

export function updateWorkshopUser(userId: string, patch: Partial<Omit<WorkshopUser, 'id'>>) {
  const users = getWorkshopUsers();
  const updated = users.map((user) => (user.id === userId ? { ...user, ...patch } : user));
  saveWorkshopUsers(updated);
}

export function resetWorkshopUserPassword(userId: string, newPassword: string) {
  updateWorkshopUser(userId, { password: newPassword });
}
