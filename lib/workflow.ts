import type { Repair, RepairOutcome, RepairStatus } from '@/types/repair';

const LEGACY_TO_WORKFLOW_STATUS: Record<string, RepairStatus> = {
  CHECKED_IN: 'IN_WORKSHOP',
  DIAGNOSIS: 'IN_WORKSHOP',
  QUOTE_PENDING: 'IN_WORKSHOP',
  APPROVED: 'IN_WORKSHOP',
  REPAIRING: 'IN_WORKSHOP',
  IN_PROGRESS: 'IN_WORKSHOP',
  READY_FOR_PICKUP: 'READY',
  DELIVERED: 'COMPLETED',
  ARCHIVED: 'COMPLETED',
  NEW_MACHINE_SOLD: 'COMPLETED',
  MACHINE_DISCARDED: 'COMPLETED',
  VOORAANMELDING: 'VOORAANMELDING',
  ONLINE_SUBMISSION: 'VOORAANMELDING',
};

export function normalizeWorkflowStatus(status: unknown): RepairStatus {
  const normalized = String(status ?? 'NEW').toUpperCase();

  if (normalized in LEGACY_TO_WORKFLOW_STATUS) {
    return LEGACY_TO_WORKFLOW_STATUS[normalized];
  }

  switch (normalized) {
    case 'NEW':
    case 'VOORAANMELDING':
    case 'IN_WORKSHOP':
    case 'WAITING_FOR_CUSTOMER':
    case 'WAITING_FOR_PARTS':
    case 'READY':
    case 'COMPLETED':
      return normalized;
    default:
      return 'NEW';
  }
}

export const OPEN_WORKSHOP_STATUSES: RepairStatus[] = [
  'NEW',
  'IN_WORKSHOP',
  'WAITING_FOR_CUSTOMER',
  'WAITING_FOR_PARTS',
  'READY',
];

export function getCommunicationSuggestions(repair: Repair): string[] {
  const suggestions: string[] = [];
  const hasPhone = Boolean(repair.phone?.trim());
  const hasEmail = Boolean(repair.email?.trim());

  if (hasPhone) {
    suggestions.push('WhatsApp');
    suggestions.push('Bellen');
  }

  if (hasEmail) {
    suggestions.push('E-mail');
  }

  if (!suggestions.length) {
    suggestions.push('Bellen');
  }

  return suggestions;
}

export function formatStatusLabel(status: RepairStatus): string {
  switch (status) {
    case 'NEW':
      return 'Nieuw';
    case 'VOORAANMELDING':
      return 'Vooraanmelding';
    case 'IN_WORKSHOP':
      return 'In werkplaats';
    case 'WAITING_FOR_CUSTOMER':
      return 'Wachten op klant';
    case 'WAITING_FOR_PARTS':
      return 'Wachten op onderdelen';
    case 'READY':
      return 'Klaar';
    case 'COMPLETED':
      return 'Afgerond';
    default:
      return status;
  }
}

export function getStatusBadgeClass(status: RepairStatus): string {
  switch (status) {
    case 'NEW':
      return 'bg-slate-200 text-slate-900 border border-slate-100';
    case 'VOORAANMELDING':
      return 'bg-amber-200 text-amber-900 border border-amber-100';
    case 'IN_WORKSHOP':
      return 'bg-sky-200 text-sky-900 border border-sky-100';
    case 'WAITING_FOR_CUSTOMER':
      return 'bg-amber-200 text-amber-900 border border-amber-100';
    case 'WAITING_FOR_PARTS':
      return 'bg-violet-200 text-violet-900 border border-violet-100';
    case 'READY':
      return 'bg-emerald-200 text-emerald-900 border border-emerald-100';
    case 'COMPLETED':
      return 'bg-zinc-200 text-zinc-900 border border-zinc-100';
    default:
      return 'bg-slate-200 text-slate-900 border border-slate-100';
  }
}

export function getStatusAccentClass(status: RepairStatus): string {
  switch (status) {
    case 'NEW':
      return 'border-l-slate-400';
    case 'VOORAANMELDING':
      return 'border-l-amber-400';
    case 'IN_WORKSHOP':
      return 'border-l-sky-400';
    case 'WAITING_FOR_CUSTOMER':
      return 'border-l-amber-400';
    case 'WAITING_FOR_PARTS':
      return 'border-l-violet-400';
    case 'READY':
      return 'border-l-emerald-400';
    case 'COMPLETED':
      return 'border-l-slate-400';
    default:
      return 'border-l-slate-400';
  }
}

export function formatOutcomeLabel(outcome?: RepairOutcome): string {
  switch (outcome) {
    case 'REPAIRED':
      return 'Gerepareerd';
    case 'MAINTENANCE_DONE':
      return 'Onderhoud uitgevoerd';
    case 'WARRANTY':
      return 'Garantie';
    case 'NEW_MACHINE_SOLD':
      return 'Nieuwe naaimachine verkocht';
    case 'MACHINE_DISCARDED':
      return 'Machine afgevoerd';
    default:
      return '';
  }
}

export function getOutcomeBadgeClass(outcome?: RepairOutcome): string {
  switch (outcome) {
    case 'REPAIRED':
      return 'bg-emerald-100 text-emerald-800';
    case 'MAINTENANCE_DONE':
      return 'bg-sky-100 text-sky-800';
    case 'WARRANTY':
      return 'bg-violet-100 text-violet-800';
    case 'NEW_MACHINE_SOLD':
      return 'bg-indigo-100 text-indigo-800';
    case 'MACHINE_DISCARDED':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
