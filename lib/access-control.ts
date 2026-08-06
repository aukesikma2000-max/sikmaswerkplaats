import type { WorkshopUserRole } from '@/lib/active-user';

export type AppPermission =
  | 'dashboard.view'
  | 'repairs.create'
  | 'repairs.view'
  | 'pickup.manage'
  | 'onlineSubmissions.view'
  | 'customers.view'
  | 'workshop.manage'
  | 'archive.view'
  | 'settings.view'
  | 'settings.users';

const ROLE_PERMISSIONS: Record<WorkshopUserRole, AppPermission[]> = {
  Administrator: [
    'dashboard.view',
    'repairs.create',
    'repairs.view',
    'pickup.manage',
    'onlineSubmissions.view',
    'customers.view',
    'workshop.manage',
    'archive.view',
    'settings.view',
    'settings.users',
  ],
  'Repair Technician': [
    'dashboard.view',
    'repairs.create',
    'repairs.view',
    'pickup.manage',
    'onlineSubmissions.view',
    'customers.view',
    'workshop.manage',
    'archive.view',
  ],
  'Front Desk': [
    'dashboard.view',
    'repairs.create',
    'repairs.view',
    'pickup.manage',
    'onlineSubmissions.view',
    'customers.view',
    'archive.view',
  ],
};

const ROUTE_PERMISSION: Record<string, AppPermission> = {
  '/dashboard': 'dashboard.view',
  '/nieuwe-reparatie': 'repairs.create',
  '/machine-ophalen': 'pickup.manage',
  '/online-aanmeldingen': 'onlineSubmissions.view',
  '/reparaties': 'repairs.view',
  '/klanten': 'customers.view',
  '/werkplaats': 'workshop.manage',
  '/archief': 'archive.view',
  '/instellingen': 'settings.view',
  '/instellingen/users': 'settings.users',
};

export function hasPermission(role: WorkshopUserRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessRoute(role: WorkshopUserRole, route: string): boolean {
  const permission = ROUTE_PERMISSION[route];
  if (!permission) return true;
  return hasPermission(role, permission);
}

export function getStartPage(role: WorkshopUserRole): string {
  if (role === 'Repair Technician') return '/werkplaats';
  return '/dashboard';
}
