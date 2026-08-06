import type {
  CommunicationChannel,
  CommunicationEvent,
  CommunicationStatus,
  Customer,
  CustomerInput,
  Machine,
  PaymentMethod,
  PaymentStatus,
  Repair,
  RepairHistoryEntry,
  RepairInput,
  RepairNote,
  RepairOutcome,
  RepairStatus,
  RepairStatusHistory,
} from '@/types/repair';
import { listCommunicationEventsByRepairAndChannel, listCommunicationEventsByRepairIds, logCommunicationEvent } from '@/lib/repositories/communications';
import { createCustomer, findCustomerByEmail, findCustomerByPhone, findOrCreateCustomer, getCustomerById, getCustomerMachines, getCustomerRepairs, listCustomers, updateCustomer } from '@/lib/repositories/customers';
import { findOrCreateMachine, listMachines } from '@/lib/repositories/machines';
import { logMaintenanceServiceAudit } from '@/lib/repositories/maintenance-service-audit';
import { scheduleMaintenanceReminder } from '@/lib/repositories/maintenance-reminders';
import { addRepairNote, listRepairNotes } from '@/lib/repositories/repair-notes';
import { appendRepairStatusHistory, buildHistoryPayload, listRepairStatusHistory } from '@/lib/repositories/repair-status-history';
import { createRepair, getRepairById as getRepairByIdRepository, getRepairByWebsiteSubmissionId, listRepairs, listRepairsByMachineId, nextRepairId, updateRepair } from '@/lib/repositories/repairs';
import { getActiveWorkshopUser, getActiveWorkshopUserRole } from '@/lib/active-user';
import { OPEN_WORKSHOP_STATUSES } from '@/lib/workflow';

export type WorkshopOutcome =
  | 'REPAIRED'
  | 'MAINTENANCE_DONE'
  | 'WARRANTY'
  | 'CALL_CUSTOMER'
  | 'PARTS_NEEDED'
  | 'NOT_REPAIRABLE';

type WorkshopOutcomeInput = {
  repairId: string;
  outcome: WorkshopOutcome;
  technicianNotes?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  price?: number;
  callReason?: 'EXTRA_COSTS' | 'QUESTION' | 'PERMISSION' | 'OTHER';
  partsExpectedDate?: string;
  partsRemark?: string;
  finalNotRepairableOutcome?: Extract<RepairOutcome, 'NEW_MACHINE_SOLD' | 'MACHINE_DISCARDED'>;
};

function formatTimestamp(date: Date) {
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('nl-NL');
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function appendLine(base: string, line: string) {
  const trimmedBase = base.trim();
  return trimmedBase ? `${trimmedBase}\n${line}` : line;
}

export async function loadRepairsByStatus(statuses: RepairStatus[] | RepairStatus): Promise<Repair[]> {
  return listRepairs(statuses);
}

export async function loadActiveWorkshopRepairs(): Promise<Repair[]> {
  return listRepairs(OPEN_WORKSHOP_STATUSES);
}

export async function searchRepairs(query: string, statuses?: RepairStatus[] | RepairStatus): Promise<Repair[]> {
  const effectiveStatuses = statuses ?? ['NEW', 'IN_WORKSHOP', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_PARTS', 'READY', 'COMPLETED'];
  return listRepairs(effectiveStatuses).then((repairs) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return repairs;
    return repairs.filter((repair) => {
      const haystack = [repair.customer, repair.phone, repair.id, repair.machine, repair.brand, repair.model, repair.issue]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  });
}

export async function getRepairById(id: string): Promise<Repair | null> {
  return getRepairByIdRepository(id);
}

export function buildHistoryEntry(status: RepairStatus, note?: string): RepairHistoryEntry {
  const currentUser = getActiveWorkshopUser();
  return {
    status,
    timestamp: formatTimestamp(new Date()),
    user: currentUser,
    note,
  };
}

export async function loadCustomers(): Promise<Customer[]> {
  return listCustomers();
}

export async function loadMachines(): Promise<Machine[]> {
  return listMachines();
}

async function ensureCustomer(input: { customer: string; address?: string; phone: string; email?: string; city?: string; notes?: string }) {
  return findOrCreateCustomer({
    name: input.customer,
    address: input.address,
    phone: input.phone,
    email: input.email,
    city: input.city,
    notes: input.notes,
  });
}

async function ensureMachine(input: { customerId?: string; brand?: string; model?: string; machine?: string }) {
  return findOrCreateMachine({
    customerId: input.customerId,
    brand: input.brand,
    model: input.model,
    name: input.machine ?? [input.brand, input.model].filter(Boolean).join(' '),
  });
}

async function appendRepairHistory(id: string, status: RepairStatus, patch: Partial<Repair>, note?: string): Promise<Repair | null> {
  const repair = await getRepairById(id);
  if (!repair) {
    throw new Error(`Reparatie ${id} niet gevonden`);
  }

  const currentUser = getActiveWorkshopUser();
  const historyEntry = buildHistoryEntry(status, note);
  await appendRepairStatusHistory({
    ...buildHistoryPayload(id, status, currentUser, note),
  });

  return updateRepair(id, {
    ...patch,
    status,
    statusUpdatedAt: new Date().toISOString(),
    history: [...repair.history, historyEntry],
    updatedAt: new Date().toISOString(),
  });
}

export async function updateRepairStatus(id: string, status: RepairStatus, note?: string): Promise<Repair | null> {
  const patch: Partial<Repair> = {
    readyAt: status === 'READY' ? new Date().toISOString() : undefined,
  };
  return appendRepairHistory(id, status, patch, note);
}

export async function completeRepair(id: string, note?: string) {
  return updateRepairStatus(id, 'READY', note ?? 'Reparatie gereed en klaar voor ophalen');
}

export async function moveToPickup(id: string, note?: string) {
  return updateRepairStatus(id, 'READY', note ?? 'Reparatie is klaar voor afhaling');
}

export async function addRepair(input: RepairInput): Promise<Repair> {
  const currentUser = getActiveWorkshopUser();
  const id = await nextRepairId();
  const now = new Date();
  const date = now.toLocaleDateString('nl-NL');
  const brand = input.brand?.trim() || 'Onbekend';
  const model = input.model?.trim() || 'Onbekend';
  const machine = input.machine?.trim() || [brand, model].filter(Boolean).join(' ').trim() || 'Onbekende machine';
  let customerRecord: { id?: string } | null = null;
  let machineRecord: { id?: string } | null = null;

  try {
    if (input.existingCustomerId?.trim()) {
      const existingCustomer = await getCustomerById(input.existingCustomerId.trim());
      if (existingCustomer?.id) {
        customerRecord = { id: existingCustomer.id };
      }
    }

    if (!customerRecord?.id) {
      customerRecord = await ensureCustomer({
        customer: input.customer,
        address: input.address,
        phone: input.phone,
        email: input.email,
        city: input.city,
        notes: input.notes,
      });
    }
  } catch (error) {
    console.warn('Customer sync failed. Continuing without customerId linkage.', error);
  }

  try {
    machineRecord = await ensureMachine({
      customerId: customerRecord?.id,
      brand,
      model,
      machine,
    });
  } catch (error) {
    console.warn('Machine sync failed. Continuing without machineId linkage.', error);
  }

  const repair: Repair = {
    id,
    source: 'Balie',
    customer: input.customer,
    address: input.address,
    customerId: customerRecord?.id,
    phone: input.phone,
    email: input.email,
    city: input.city,
    brand,
    model,
    machine,
    serialNumber: input.serialNumber,
    machineId: machineRecord?.id,
    issue: input.issue,
    repair: input.repair,
    partsUsed: input.partsUsed,
    shelfLocation: input.shelfLocation,
    priority: input.priority,
    expectedDeliveryDate: input.expectedDeliveryDate,
    status: 'NEW',
    statusUpdatedAt: now.toISOString(),
    date,
    price: input.price ?? 0,
    notes: input.notes ?? '',
    paymentStatus: 'Open',
    history: [buildHistoryEntry('NEW', 'Reparatie aangemaakt aan de balie')],
    updatedAt: now.toISOString(),
  };

  const created = await createRepair(repair);
  await appendRepairStatusHistory({
    repairId: created.id,
    status: 'NEW',
    userName: currentUser,
    note: 'Reparatie aangemaakt aan de balie',
  });

  return created;
}

export type OnlineSubmissionInput = {
  websiteSubmissionId?: string;
  websiteSubmissionDate?: string;
  customer: string;
  phone: string;
  email?: string;
  city?: string;
  brand: string;
  model?: string;
  machine?: string;
  issue: string;
  notes?: string;
  address?: string;
};

export async function addOnlineSubmission(input: OnlineSubmissionInput): Promise<Repair> {
  const now = new Date();
  if (input.websiteSubmissionId?.trim()) {
    const existing = await getRepairByWebsiteSubmissionId(input.websiteSubmissionId.trim());
    if (existing) {
      return existing;
    }
  }

  const id = await nextRepairId();
  const brand = input.brand.trim();
  const model = input.model?.trim() || '';
  const machine = input.machine?.trim() || [brand, model].filter(Boolean).join(' ') || brand;
  const websiteSubmissionDate = input.websiteSubmissionDate?.trim() || now.toISOString();

  const repair: Repair = {
    id,
    source: 'Website',
    websiteSubmissionDate,
    websiteSubmissionId: input.websiteSubmissionId?.trim() || undefined,
    convertedToRepair: false,
    customer: input.customer.trim(),
    address: input.address?.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim(),
    city: input.city?.trim() || '',
    brand,
    model,
    machine,
    serialNumber: '',
    issue: input.issue.trim(),
    repair: '',
    status: 'VOORAANMELDING',
    date: now.toLocaleDateString('nl-NL'),
    price: 0,
    notes: input.notes?.trim() || '',
    paymentStatus: 'Open',
    history: [{
      status: 'VOORAANMELDING',
      timestamp: formatTimestamp(now),
      user: 'Website',
      note: 'Vooraanmelding ontvangen via website.',
    }],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const created = await createRepair(repair);
  await appendRepairStatusHistory({
    repairId: created.id,
    status: 'VOORAANMELDING',
    userName: 'Website',
    note: 'Vooraanmelding ontvangen via website.',
    createdAt: now.toISOString(),
  });

  await logCommunicationEvent({
    customerId: created.customerId,
    repairId: created.id,
    channel: 'ONLINE_FORM',
    type: 'SYSTEM',
    occurredAt: websiteSubmissionDate,
    actorName: 'Website',
    subject: 'Online reparatieformulier ontvangen',
    messageBody: 'Online reparatieformulier ontvangen.',
    status: 'LOGGED',
    isAutomatic: true,
    metadata: {
      source: 'Website',
      websiteSubmissionId: created.websiteSubmissionId,
    },
  });

  return created;
}

export async function convertOnlineSubmissionToRepair(repairId: string): Promise<Repair> {
  const repair = await getRepairById(repairId);
  if (!repair) {
    throw new Error(`Vooraanmelding ${repairId} niet gevonden`);
  }

  if (repair.status !== 'VOORAANMELDING') {
    throw new Error('Alleen vooraanmeldingen kunnen worden ontvangen aan de balie.');
  }

  let customer = null as Customer | null;
  if (repair.phone?.trim()) {
    customer = await findCustomerByPhone(repair.phone);
  }
  if (!customer && repair.email?.trim()) {
    customer = await findCustomerByEmail(repair.email);
  }

  if (!customer) {
    customer = await createCustomer({
      name: repair.customer,
      phone: repair.phone,
      email: repair.email,
      city: repair.city,
      address: repair.address,
      notes: repair.notes,
    });
  }

  let machineRecord = null as Machine | null;
  try {
    machineRecord = await findOrCreateMachine({
      customerId: customer.id,
      brand: repair.brand,
      model: repair.model,
      name: repair.machine || [repair.brand, repair.model].filter(Boolean).join(' '),
    });
  } catch (error) {
    console.warn('Machine sync failed during online submission conversion.', error);
  }

  const convertedAt = new Date().toISOString();
  const converted = await appendRepairHistory(repair.id, 'NEW', {
    source: repair.source ?? 'Website',
    customer: customer.name || repair.customer,
    customerId: customer.id,
    phone: customer.phone || repair.phone,
    email: customer.email || repair.email,
    city: customer.city || repair.city,
    address: customer.address || repair.address,
    brand: repair.brand,
    model: repair.model,
    machine: repair.machine,
    machineId: machineRecord?.id,
    issue: repair.issue,
    repair: repair.repair,
    websiteSubmissionDate: repair.websiteSubmissionDate,
    websiteSubmissionId: repair.websiteSubmissionId,
    convertedToRepair: true,
    convertedAt,
    convertedBy: getActiveWorkshopUser(),
    statusUpdatedAt: convertedAt,
    updatedAt: convertedAt,
  }, 'Machine ontvangen aan de balie.');
  if (!converted) {
    throw new Error('Vooraanmelding kon niet worden omgezet naar een reparatie.');
  }

  return converted;
}

export async function loadCustomerCommunication(customerId: string): Promise<CommunicationEvent[]> {
  const repairs = await loadCustomerRepairs(customerId);
  return listCommunicationEventsByRepairIds(repairs.map((repair) => repair.id));
}

export async function handoverMachine(id: string, paymentStatus: PaymentStatus, note?: string): Promise<Repair | null> {
  const handoverDate = new Date();
  return appendRepairHistory(id, 'COMPLETED', {
    paymentStatus,
    deliveryDate: handoverDate.toLocaleDateString('nl-NL'),
    readyAt: undefined,
  }, note ?? `Machine afgegeven met betaalstatus ${paymentStatus}`);
}

type HandoverOptions = {
  maintenanceReminderOptIn?: boolean;
};

export type MachineDeliveryInput = {
  repairId: string;
  paymentStatus: Extract<PaymentStatus, 'Open' | 'Betaald'>;
  paymentMethod?: PaymentMethod;
  counterNote?: string;
  maintenanceReminderOptIn: boolean;
};

export type MaintenanceServiceUpdateInput = {
  customerId: string;
  maintenanceReminderOptIn: boolean;
  nextMaintenanceReminderDate?: string;
  reason?: string;
  source?: string;
  repairId?: string;
};

export async function updateMaintenanceServicePreferences(input: MaintenanceServiceUpdateInput): Promise<Customer> {
  const existingCustomer = await getCustomerById(input.customerId);
  if (!existingCustomer) {
    throw new Error('Klant niet gevonden.');
  }

  const now = new Date();
  const actorName = getActiveWorkshopUser();
  const actorRole = getActiveWorkshopUserRole();
  const isOptIn = input.maintenanceReminderOptIn;
  const nextDate = isOptIn ? input.nextMaintenanceReminderDate : undefined;

  const patch: CustomerInput = {
    maintenanceReminderOptIn: isOptIn,
    nextMaintenanceReminderDate: nextDate,
    maintenanceReminderStatus: isOptIn ? 'PLANNED' : 'UNSUBSCRIBED',
    maintenanceLastModified: now.toISOString(),
    maintenanceUnsubscribeReason: !isOptIn ? (input.reason?.trim() || 'Klant heeft zich afgemeld voor de onderhoudsservice.') : undefined,
    maintenanceUnsubscribedAt: !isOptIn ? now.toISOString() : undefined,
    maintenanceConsentDate: isOptIn
      ? (existingCustomer.maintenanceConsentDate ?? now.toISOString())
      : existingCustomer.maintenanceConsentDate,
    maintenanceConsentMethod: isOptIn
      ? (existingCustomer.maintenanceConsentMethod ?? 'Aangepast in klantdossier')
      : existingCustomer.maintenanceConsentMethod,
    maintenanceConsentEmployee: isOptIn
      ? (existingCustomer.maintenanceConsentEmployee ?? actorName)
      : existingCustomer.maintenanceConsentEmployee,
  };

  const updatedCustomer = await updateCustomer(input.customerId, patch);

  await logMaintenanceServiceAudit({
    customerId: input.customerId,
    repairId: input.repairId,
    eventType: isOptIn ? 'SERVICE_ENABLED' : 'SERVICE_DISABLED',
    note: isOptIn
      ? 'Gratis onderhoudsservice geactiveerd in klantdossier.'
      : 'Gratis onderhoudsservice uitgeschakeld in klantdossier.',
    oldValue: {
      maintenanceReminderOptIn: existingCustomer.maintenanceReminderOptIn ?? false,
      nextMaintenanceReminderDate: existingCustomer.nextMaintenanceReminderDate,
      maintenanceReminderStatus: existingCustomer.maintenanceReminderStatus,
    },
    newValue: {
      maintenanceReminderOptIn: updatedCustomer.maintenanceReminderOptIn ?? false,
      nextMaintenanceReminderDate: updatedCustomer.nextMaintenanceReminderDate,
      maintenanceReminderStatus: updatedCustomer.maintenanceReminderStatus,
    },
    reason: !isOptIn ? (input.reason?.trim() || undefined) : undefined,
    actorName,
    actorRole,
  });

  if (isOptIn && nextDate) {
    await scheduleMaintenanceReminder({
      customerId: input.customerId,
      repairId: input.repairId,
      plannedFor: nextDate,
      source: input.source ?? 'CUSTOMER_DOSSIER',
      notes: 'Aangemaakt of bijgewerkt vanuit klantdossier.',
    });

    await logMaintenanceServiceAudit({
      customerId: input.customerId,
      repairId: input.repairId,
      eventType: 'REMINDER_PLANNED',
      note: `Onderhoudsherinnering gepland voor ${nextDate}.`,
      oldValue: { maintenanceReminderStatus: existingCustomer.maintenanceReminderStatus ?? 'INACTIVE' },
      newValue: { maintenanceReminderStatus: 'PLANNED', plannedFor: nextDate },
      actorName,
      actorRole,
    });
  }

  return updatedCustomer;
}

async function applyPickupMaintenanceConsent(repair: Repair, handoverDate: Date) {
  if (!repair.customerId) {
    throw new Error('Onderhoudsservice kan niet worden opgeslagen zonder gekoppelde klant. Werk eerst het klantdossier bij.');
  }

  const reminderDate = addMonths(handoverDate, 12);
  const reminderDateIso = formatIsoDate(reminderDate);
  const reminderDateLabel = formatDate(reminderDate);
  const actorName = getActiveWorkshopUser();
  const actorRole = getActiveWorkshopUserRole();
  const existingCustomer = await getCustomerById(repair.customerId);

  const customerPatch: CustomerInput = {
    maintenanceReminderOptIn: true,
    nextMaintenanceReminderDate: reminderDateIso,
    maintenanceConsentDate: handoverDate.toISOString(),
    maintenanceConsentMethod: 'Mondeling aan de balie',
    maintenanceConsentEmployee: actorName,
    maintenanceReminderStatus: 'PLANNED',
    maintenanceLastModified: handoverDate.toISOString(),
    maintenanceUnsubscribedAt: undefined,
    maintenanceUnsubscribeReason: undefined,
  };
  await updateCustomer(repair.customerId, customerPatch);

  await scheduleMaintenanceReminder({
    customerId: repair.customerId,
    repairId: repair.id,
    plannedFor: reminderDateIso,
    source: 'PICKUP_WORKFLOW',
    notes: 'Aangemaakt bij machine afgeven na mondeling akkoord klant.',
  });

  await logMaintenanceServiceAudit({
    customerId: repair.customerId,
    repairId: repair.id,
    eventType: 'CONSENT_RECORDED',
    note: 'Klant heeft tijdens het afhalen mondeling ingestemd met het ontvangen van een gratis onderhoudsherinnering.',
    oldValue: {
      maintenanceReminderOptIn: existingCustomer?.maintenanceReminderOptIn ?? false,
      nextMaintenanceReminderDate: existingCustomer?.nextMaintenanceReminderDate,
    },
    newValue: {
      maintenanceReminderOptIn: true,
      nextMaintenanceReminderDate: reminderDateIso,
      maintenanceConsentMethod: 'Mondeling aan de balie',
      maintenanceConsentDate: handoverDate.toISOString(),
      maintenanceConsentEmployee: actorName,
    },
    actorName,
    actorRole,
  });

  await logMaintenanceServiceAudit({
    customerId: repair.customerId,
    repairId: repair.id,
    eventType: 'REMINDER_PLANNED',
    note: `Onderhoudsherinnering gepland voor ${reminderDateLabel}.`,
    oldValue: { maintenanceReminderStatus: existingCustomer?.maintenanceReminderStatus ?? 'INACTIVE' },
    newValue: { maintenanceReminderStatus: 'PLANNED', plannedFor: reminderDateIso },
    actorName,
    actorRole,
  });

  return { reminderDateIso, reminderDateLabel };
}

export async function completeMachineDelivery(input: MachineDeliveryInput): Promise<Repair> {
  const repair = await getRepairById(input.repairId);
  if (!repair) {
    throw new Error('Reparatiedossier niet gevonden.');
  }

  if (repair.status !== 'READY') {
    throw new Error('Alleen reparaties met status Klaar kunnen worden afgegeven.');
  }

  if (!Number.isFinite(repair.price)) {
    throw new Error('Prijs ontbreekt. Vul eerst een geldige prijs in via het werkplaatsdossier.');
  }

  if (repair.price > 0 && input.paymentStatus !== 'Betaald') {
    throw new Error('Betaling is nog niet verwerkt. Zet betaalstatus op Betaald voordat je de machine afgeeft.');
  }

  if (input.paymentStatus === 'Betaald' && !input.paymentMethod) {
    throw new Error('Kies een betaalmethode voor een betaalde reparatie.');
  }

  const counterNote = input.counterNote?.trim() ?? '';
  if (counterNote.length > 250) {
    throw new Error('Interne balienotitie mag maximaal 250 tekens bevatten.');
  }

  const handoverDate = new Date();
  let nextMaintenanceDate = repair.nextMaintenanceDate;

  if (input.maintenanceReminderOptIn) {
    const maintenanceResult = await applyPickupMaintenanceConsent(repair, handoverDate);
    nextMaintenanceDate = maintenanceResult.reminderDateLabel;
  }

  const paymentLine = input.paymentStatus === 'Betaald'
    ? `Betaling verwerkt (${input.paymentMethod}).`
    : 'Betaling blijft open.';
  const reminderLine = input.maintenanceReminderOptIn
    ? 'Klant gaf mondeling akkoord voor gratis onderhoudsherinnering.'
    : 'Geen onderhoudsherinnering geactiveerd.';

  const delivered = await appendRepairHistory(repair.id, 'COMPLETED', {
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentStatus === 'Betaald' ? input.paymentMethod : undefined,
    counterNote,
    deliveryDate: handoverDate.toLocaleDateString('nl-NL'),
    nextMaintenanceDate,
    readyAt: undefined,
  }, `${paymentLine} ${reminderLine}`);

  if (!delivered) {
    throw new Error('Machine kon niet worden afgegeven.');
  }

  return delivered;
}

export async function handoverRepairs(ids: string[], paymentStatus: PaymentStatus, options?: HandoverOptions): Promise<void> {
  for (const id of ids) {
    const repair = await getRepairById(id);
    if (!repair) continue;

    const handoverDate = new Date();
    const timelineNote = options?.maintenanceReminderOptIn
      ? 'Klant heeft tijdens het afhalen ingestemd met een gratis onderhoudsherinnering.'
      : undefined;
    let nextMaintenanceDate = repair.nextMaintenanceDate;

    if (options?.maintenanceReminderOptIn) {
      const maintenanceResult = await applyPickupMaintenanceConsent(repair, handoverDate);
      nextMaintenanceDate = maintenanceResult.reminderDateLabel;
    }

    await appendRepairHistory(id, 'COMPLETED', {
      paymentStatus,
      deliveryDate: handoverDate.toLocaleDateString('nl-NL'),
      nextMaintenanceDate,
      readyAt: undefined,
    }, timelineNote ?? `Machine afgegeven met betaalstatus ${paymentStatus}`);
  }
}

export async function archiveRepair(id: string, note?: string): Promise<Repair | null> {
  return appendRepairHistory(id, 'COMPLETED', {
    archivedDate: new Date().toLocaleDateString('nl-NL'),
  }, note);
}

export async function saveWorkshopOutcome(input: WorkshopOutcomeInput): Promise<Repair | null> {
  const repair = await getRepairById(input.repairId);
  if (!repair) {
    throw new Error(`Reparatie ${input.repairId} niet gevonden`);
  }

  const patch: Partial<Repair> = {
    brand: input.brand?.trim() || repair.brand,
    model: input.model?.trim() || repair.model,
    serialNumber: input.serialNumber?.trim() || repair.serialNumber,
    notes: input.technicianNotes?.trim() || repair.notes,
    updatedAt: new Date().toISOString(),
  };

  let status: RepairStatus = repair.status;
  let historyNote = 'Werkplaatsgegevens bijgewerkt';

  if (input.outcome === 'REPAIRED' || input.outcome === 'MAINTENANCE_DONE' || input.outcome === 'WARRANTY') {
    status = 'READY';
    patch.price = input.price ?? repair.price ?? 0;
    patch.repairOutcome = input.outcome;
    patch.repair = input.outcome === 'REPAIRED'
      ? 'Gerepareerd'
      : input.outcome === 'MAINTENANCE_DONE'
        ? 'Onderhoud uitgevoerd'
        : 'Garantie';
    patch.readyAt = new Date().toISOString();

    const reminderDate = formatDate(addMonths(new Date(), 12));
    patch.nextMaintenanceDate = reminderDate;
    patch.notes = appendLine(patch.notes ?? '', `Onderhoudsherinnering gepland op ${reminderDate}.`);
    historyNote = `Status aangepast naar Klaar na uitkomst ${patch.repair.toLowerCase()}.`;
  }

  if (input.outcome === 'CALL_CUSTOMER') {
    status = 'WAITING_FOR_CUSTOMER';
    patch.repairOutcome = undefined;
    patch.readyAt = undefined;
    const reasonLabel = input.callReason === 'EXTRA_COSTS'
      ? 'Extra kosten'
      : input.callReason === 'QUESTION'
        ? 'Vraag'
        : input.callReason === 'PERMISSION'
          ? 'Toestemming'
          : 'Anders';
    patch.notes = appendLine(patch.notes ?? '', `Beltaak aangemaakt: ${reasonLabel}.`);
    historyNote = `Wachten op klant: ${reasonLabel}.`;
  }

  if (input.outcome === 'PARTS_NEEDED') {
    status = 'WAITING_FOR_PARTS';
    patch.repairOutcome = undefined;
    patch.readyAt = undefined;
    if (input.partsExpectedDate) {
      patch.expectedDeliveryDate = input.partsExpectedDate;
    }
    if (input.partsRemark?.trim()) {
      patch.notes = appendLine(patch.notes ?? '', `Onderdelen: ${input.partsRemark.trim()}`);
    }
    historyNote = 'Wachten op onderdelen ingesteld.';
  }

  if (input.outcome === 'NOT_REPAIRABLE') {
    if (!input.finalNotRepairableOutcome) {
      throw new Error('Kies een definitieve uitkomst: Nieuwe naaimachine verkocht of Machine afgevoerd.');
    }

    status = 'COMPLETED';
    patch.repairOutcome = input.finalNotRepairableOutcome;
    patch.repair = input.finalNotRepairableOutcome === 'NEW_MACHINE_SOLD'
      ? 'Nieuwe naaimachine verkocht'
      : 'Machine afgevoerd';
    patch.readyAt = undefined;
    historyNote = `Dossier afgerond: ${patch.repair}.`;
  }

  return appendRepairHistory(input.repairId, status, patch, historyNote);
}

export async function moveRepairToWorkshop(id: string): Promise<Repair | null> {
  return updateRepairStatus(id, 'IN_WORKSHOP', 'Werkplaats gestart met dossier');
}

export async function ensureRepairInProgress(id: string): Promise<Repair | null> {
  const repair = await getRepairById(id);
  if (!repair) return null;
  if (repair.status === 'VOORAANMELDING') return repair;
  if (repair.status !== 'NEW') return repair;
  return moveRepairToWorkshop(id);
}

export async function markReadyForPickup(id: string): Promise<Repair | null> {
  return updateRepairStatus(id, 'READY', 'Klaar voor contact met klant');
}

export async function loadCustomerById(id: string): Promise<Customer | null> {
  return getCustomerById(id);
}

export async function loadCustomerMachines(customerId: string): Promise<Machine[]> {
  return getCustomerMachines(customerId);
}

export async function loadCustomerRepairs(customerId: string): Promise<Repair[]> {
  return getCustomerRepairs(customerId);
}

export async function loadRepairStatusTimeline(repairId: string): Promise<RepairStatusHistory[]> {
  return listRepairStatusHistory(repairId);
}

export async function loadRepairNotes(repairId: string): Promise<RepairNote[]> {
  return listRepairNotes(repairId);
}

export async function addNoteToRepair(repairId: string, note: string) {
  return addRepairNote({ repairId, note, createdBy: getActiveWorkshopUser() });
}

export async function listOpenCustomerRepairs(customerId: string, excludeRepairId?: string): Promise<Repair[]> {
  const repairs = await loadCustomerRepairs(customerId);
  return repairs.filter((repair) => repair.status !== 'COMPLETED' && repair.id !== excludeRepairId);
}

export async function getRepairGroupMembers(repair: Repair): Promise<Repair[]> {
  if (!repair.repairGroupId || !repair.customerId) {
    return [repair];
  }

  const customerRepairs = await loadCustomerRepairs(repair.customerId);
  const sameGroup = customerRepairs.filter((entry) => entry.repairGroupId === repair.repairGroupId);
  return sameGroup.length ? sameGroup : [repair];
}

export async function linkRepairs(baseRepairId: string, selectedRepairIds: string[]): Promise<Repair[]> {
  const baseRepair = await getRepairById(baseRepairId);
  if (!baseRepair) {
    throw new Error('Basisreparatie niet gevonden.');
  }

  if (!baseRepair.customerId) {
    throw new Error('Koppelen vereist een gekoppelde klant-ID.');
  }

  const targetIds = Array.from(new Set([baseRepairId, ...selectedRepairIds]));
  const customerRepairs = await loadCustomerRepairs(baseRepair.customerId);
  const targetRepairs = customerRepairs.filter((repair) => targetIds.includes(repair.id));

  if (targetRepairs.some((repair) => repair.status === 'COMPLETED')) {
    throw new Error('Afgeronde reparaties kunnen niet gekoppeld worden.');
  }

  const existingGroupId = targetRepairs.find((repair) => repair.repairGroupId)?.repairGroupId;
  const groupId = existingGroupId ?? `grp-${crypto.randomUUID()}`;

  for (const repair of targetRepairs) {
    await updateRepair(repair.id, {
      repairGroupId: groupId,
      updatedAt: new Date().toISOString(),
    });
  }

  const refreshed = await loadCustomerRepairs(baseRepair.customerId);
  return refreshed.filter((repair) => repair.repairGroupId === groupId);
}

export async function unlinkRepairFromGroup(repairId: string): Promise<void> {
  const repair = await getRepairById(repairId);
  if (!repair?.repairGroupId) return;

  const groupMembers = await getRepairGroupMembers(repair);
  if (groupMembers.length <= 2) {
    for (const member of groupMembers) {
      await updateRepair(member.id, { repairGroupId: undefined, updatedAt: new Date().toISOString() });
    }
    return;
  }

  await updateRepair(repair.id, { repairGroupId: undefined, updatedAt: new Date().toISOString() });
}

export async function getGroupReadyCommunicationDraft(repairId: string): Promise<string | null> {
  const repair = await getRepairById(repairId);
  if (!repair || !repair.repairGroupId) return null;

  const groupMembers = await getRepairGroupMembers(repair);
  if (groupMembers.length < 2) return null;

  const allReady = groupMembers.every((member) => member.status === 'READY');
  if (!allReady) return null;

  return `WhatsApp voorstel: Uw machines staan voor u klaar om opgehaald te worden (${groupMembers.length} reparaties).`;
}

export async function loadMachineHistory(machineId: string): Promise<Repair[]> {
  return listRepairsByMachineId(machineId);
}

export async function saveRepairMachineDetails(
  id: string,
  details: { brand?: string; model?: string; serialNumber?: string },
): Promise<Repair> {
  return updateRepair(id, { ...details, updatedAt: new Date().toISOString() });
}

export async function saveRepairNotesAndPrice(id: string, notes: string, price: number): Promise<Repair> {
  return updateRepair(id, { notes, price, updatedAt: new Date().toISOString() });
}

export async function loadRepairCommunication(repairIds: string[]): Promise<CommunicationEvent[]> {
  return listCommunicationEventsByRepairIds(repairIds);
}

export async function loadRepairChannelCommunication(repairId: string, channel: CommunicationChannel): Promise<CommunicationEvent[]> {
  return listCommunicationEventsByRepairAndChannel(repairId, channel);
}

export async function addCommunicationEvent(input: {
  customerId?: string;
  repairId?: string;
  machineId?: string;
  channel: CommunicationChannel;
  type?: 'CUSTOMER' | 'INTERNAL' | 'SYSTEM' | 'AUTOMATIC' | 'MANUAL' | 'MARKETING' | 'OTHER';
  occurredAt?: string;
  actorName?: string;
  actorId?: string;
  subject?: string;
  messageBody?: string;
  status?: CommunicationStatus;
  isAutomatic?: boolean;
  errorMessage?: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<CommunicationEvent> {
  return logCommunicationEvent(input);
}
