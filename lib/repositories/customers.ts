import { getSupabase } from '@/lib/supabase-client';
import type { Customer, CustomerInput, Machine, Repair } from '@/types/repair';
import { normalizeWorkflowStatus } from '@/lib/workflow';

type RawRow = Record<string, unknown>;

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703'
    || error.code === 'PGRST204'
    || /column .* does not exist/i.test(error.message ?? '')
    || /could not find the '.*' column of '.*' in the schema cache/i.test(error.message ?? '')
  );
}

function buildDisplayName(firstName?: string, lastName?: string, fallbackName?: string) {
  const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return combinedName || fallbackName?.trim() || '';
}

function splitName(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { firstName: '', lastName: '' };
  }

  const [firstName, ...lastNameParts] = trimmedName.split(/\s+/);
  return {
    firstName,
    lastName: lastNameParts.join(' '),
  };
}

function toOptionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function toOptionalBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function getMissingColumnName(message?: string) {
  const match = message?.match(/column\s+([\w."]+)\s+does not exist/i);
  if (match) {
    return match[1].split('.').pop()?.replace(/"/g, '') ?? null;
  }

  const schemaCacheMatch = message?.match(/could not find the '([^']+)' column of '[^']+' in the schema cache/i);
  if (schemaCacheMatch) {
    return schemaCacheMatch[1];
  }

  return null;
}

async function persistCustomerPayload<T extends Record<string, unknown>>(method: 'insert' | 'update', payload: T, customerId?: string) {
  const supabase = getSupabase();
  const candidatePayload: Record<string, unknown> = { ...payload };

  while (true) {
    const query = method === 'insert'
      ? supabase.from('customers').insert(candidatePayload).select('*').single()
      : supabase.from('customers').update(candidatePayload).eq('id', customerId).select('*').single();

    const { data, error } = await query;

    if (!error) {
      return normalizeCustomer(data as RawRow);
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }

    const missingColumn = getMissingColumnName(error.message);
    if (!missingColumn || !(missingColumn in candidatePayload)) {
      throw new Error(error.message);
    }

    delete candidatePayload[missingColumn];
  }
}

function buildCustomerPayload(input: CustomerInput) {
  const explicitFirstName = toOptionalString(input.firstName);
  const explicitLastName = toOptionalString(input.lastName);
  const fallbackName = toOptionalString(input.name) ?? '';
  const derivedNameParts = (!explicitFirstName && !explicitLastName) ? splitName(fallbackName) : { firstName: explicitFirstName ?? '', lastName: explicitLastName ?? '' };
  const firstName = explicitFirstName ?? toOptionalString(derivedNameParts.firstName);
  const lastName = explicitLastName ?? toOptionalString(derivedNameParts.lastName);
  const mobilePhone = toOptionalString(input.mobilePhone);
  const landlinePhone = toOptionalString(input.landlinePhone);
  const fallbackPhone = toOptionalString(input.phone);
  const phone = mobilePhone ?? landlinePhone ?? fallbackPhone;
  const name = buildDisplayName(firstName, lastName, fallbackName);

  return {
    firstName,
    lastName,
    name,
    address: toOptionalString(input.address),
    postalCode: toOptionalString(input.postalCode),
    mobilePhone,
    landlinePhone,
    phone,
    email: toOptionalString(input.email),
    city: toOptionalString(input.city),
    maintenanceReminderOptIn: typeof input.maintenanceReminderOptIn === 'boolean' ? input.maintenanceReminderOptIn : undefined,
    nextMaintenanceReminderDate: toOptionalString(input.nextMaintenanceReminderDate),
    maintenanceConsentDate: toOptionalString(input.maintenanceConsentDate),
    maintenanceConsentMethod: toOptionalString(input.maintenanceConsentMethod),
    maintenanceConsentEmployee: toOptionalString(input.maintenanceConsentEmployee),
    maintenanceReminderStatus: toOptionalString(input.maintenanceReminderStatus),
    maintenanceLastModified: toOptionalString(input.maintenanceLastModified),
    maintenanceUnsubscribedAt: toOptionalString(input.maintenanceUnsubscribedAt),
    maintenanceUnsubscribeReason: toOptionalString(input.maintenanceUnsubscribeReason),
    notes: toOptionalString(input.notes),
    updatedAt: new Date().toISOString(),
  };
}

function buildCustomerWritePayload(
  payload: ReturnType<typeof buildCustomerPayload>,
  options: { includeCreatedAt: boolean },
) {
  const writePayload: Record<string, unknown> = {
    firstName: payload.firstName,
    first_name: payload.firstName,
    voornaam: payload.firstName,
    given_name: payload.firstName,
    lastName: payload.lastName,
    last_name: payload.lastName,
    achternaam: payload.lastName,
    surname: payload.lastName,
    family_name: payload.lastName,
    name: payload.name,
    full_name: payload.name,
    customer_name: payload.name,
    naam: payload.name,
    klantnaam: payload.name,
    address: payload.address,
    adres: payload.address,
    postalCode: payload.postalCode,
    postal_code: payload.postalCode,
    mobilePhone: payload.mobilePhone,
    mobile_phone: payload.mobilePhone,
    landlinePhone: payload.landlinePhone,
    landline_phone: payload.landlinePhone,
    phone: payload.phone,
    phone_number: payload.phone,
    email: payload.email,
    email_address: payload.email,
    city: payload.city,
    place: payload.city,
    maintenanceReminderOptIn: payload.maintenanceReminderOptIn,
    maintenance_reminder_opt_in: payload.maintenanceReminderOptIn,
    maintenanceReminderAllowed: payload.maintenanceReminderOptIn,
    maintenance_reminder_allowed: payload.maintenanceReminderOptIn,
    nextMaintenanceReminderDate: payload.nextMaintenanceReminderDate,
    next_maintenance_reminder_date: payload.nextMaintenanceReminderDate,
    maintenanceConsentDate: payload.maintenanceConsentDate,
    maintenance_consent_date: payload.maintenanceConsentDate,
    maintenanceConsentMethod: payload.maintenanceConsentMethod,
    maintenance_consent_method: payload.maintenanceConsentMethod,
    maintenanceConsentEmployee: payload.maintenanceConsentEmployee,
    maintenance_consent_employee: payload.maintenanceConsentEmployee,
    maintenanceReminderStatus: payload.maintenanceReminderStatus,
    maintenance_reminder_status: payload.maintenanceReminderStatus,
    maintenanceLastModified: payload.maintenanceLastModified,
    maintenance_last_modified: payload.maintenanceLastModified,
    maintenanceUnsubscribedAt: payload.maintenanceUnsubscribedAt,
    maintenance_unsubscribed_at: payload.maintenanceUnsubscribedAt,
    maintenanceUnsubscribeReason: payload.maintenanceUnsubscribeReason,
    maintenance_unsubscribe_reason: payload.maintenanceUnsubscribeReason,
    notes: payload.notes,
    note: payload.notes,
    updatedAt: payload.updatedAt,
    updated_at: payload.updatedAt,
  };

  if (options.includeCreatedAt) {
    const createdAt = new Date().toISOString();
    writePayload.createdAt = createdAt;
    writePayload.created_at = createdAt;
  }

  return writePayload;
}

function normalizeCustomer(row: RawRow): Customer {
  const rawName = String(row.name ?? row.full_name ?? row.customer_name ?? row.naam ?? row.klantnaam ?? '').trim();
  const firstName = String(row.firstName ?? row.first_name ?? row.voornaam ?? '').trim();
  const lastName = String(row.lastName ?? row.last_name ?? row.achternaam ?? '').trim();
  const fallbackName = buildDisplayName(firstName, lastName, rawName);
  const derivedNameParts = (!firstName && !lastName) ? splitName(rawName) : { firstName, lastName };
  const mobilePhone = (row.mobilePhone as string | undefined) ?? (row.mobile_phone as string | undefined);
  const landlinePhone = (row.landlinePhone as string | undefined) ?? (row.landline_phone as string | undefined);
  const phone = (row.phone as string | undefined) ?? mobilePhone ?? landlinePhone;

  return {
    id: String(row.id ?? ''),
    customerNumber: (row.customerNumber as string | undefined) ?? (row.customer_number as string | undefined) ?? (row.klantnummer as string | undefined),
    firstName: toOptionalString(firstName || derivedNameParts.firstName),
    lastName: toOptionalString(lastName || derivedNameParts.lastName),
    name: fallbackName,
    address: (row.address as string | undefined) ?? undefined,
    postalCode: (row.postalCode as string | undefined) ?? (row.postal_code as string | undefined),
    mobilePhone,
    landlinePhone,
    phone,
    email: (row.email as string | undefined) ?? (row.email_address as string | undefined),
    city: (row.city as string | undefined) ?? (row.place as string | undefined),
    maintenanceReminderOptIn: toOptionalBoolean(
      row.maintenanceReminderOptIn
      ?? row.maintenance_reminder_opt_in
      ?? row.maintenanceReminderAllowed
      ?? row.maintenance_reminder_allowed,
    ),
    nextMaintenanceReminderDate: (row.nextMaintenanceReminderDate as string | undefined) ?? (row.next_maintenance_reminder_date as string | undefined),
    maintenanceConsentDate: (row.maintenanceConsentDate as string | undefined) ?? (row.maintenance_consent_date as string | undefined),
    maintenanceConsentMethod: (row.maintenanceConsentMethod as string | undefined) ?? (row.maintenance_consent_method as string | undefined),
    maintenanceConsentEmployee: (row.maintenanceConsentEmployee as string | undefined) ?? (row.maintenance_consent_employee as string | undefined),
    maintenanceReminderStatus: (row.maintenanceReminderStatus as string | undefined) ?? (row.maintenance_reminder_status as string | undefined),
    maintenanceLastModified: (row.maintenanceLastModified as string | undefined) ?? (row.maintenance_last_modified as string | undefined),
    maintenanceUnsubscribedAt: (row.maintenanceUnsubscribedAt as string | undefined) ?? (row.maintenance_unsubscribed_at as string | undefined),
    maintenanceUnsubscribeReason: (row.maintenanceUnsubscribeReason as string | undefined) ?? (row.maintenance_unsubscribe_reason as string | undefined),
    notes: (row.notes as string | undefined) ?? (row.note as string | undefined),
    createdAt: (row.createdAt as string | undefined) ?? (row.created_at as string | undefined),
    updatedAt: (row.updatedAt as string | undefined) ?? (row.updated_at as string | undefined),
  };
}

function normalizeMachine(row: RawRow): Machine {
  return {
    id: String(row.id ?? ''),
    customerId: (row.customerId as string | undefined) ?? (row.customer_id as string | undefined),
    name: String(row.name ?? row.machine_name ?? row.naam ?? [row.brand, row.model].filter(Boolean).join(' ')),
    brand: (row.brand as string | undefined) ?? (row.merk as string | undefined),
    model: (row.model as string | undefined) ?? (row.type as string | undefined),
    serialNumber: (row.serialNumber as string | undefined) ?? (row.serial_number as string | undefined) ?? (row.serienummer as string | undefined),
    purchaseDate: (row.purchaseDate as string | undefined) ?? (row.purchase_date as string | undefined),
    notes: (row.notes as string | undefined) ?? (row.note as string | undefined),
    createdAt: (row.createdAt as string | undefined) ?? (row.created_at as string | undefined),
    updatedAt: (row.updatedAt as string | undefined) ?? (row.updated_at as string | undefined),
  };
}

function normalizeRepair(row: RawRow): Repair {
  const historyValue = row.history;
  const parsedHistory = Array.isArray(historyValue) ? historyValue : [];

  return {
    id: String(row.id ?? ''),
    customer: String(row.customer ?? row.customer_name ?? row.name ?? ''),
    address: (row.address as string | undefined) ?? undefined,
    phone: String(row.phone ?? row.phone_number ?? ''),
    customerId: (row.customerId as string | undefined) ?? (row.customer_id as string | undefined),
    email: (row.email as string | undefined) ?? (row.email_address as string | undefined),
    city: String(row.city ?? row.place ?? ''),
    brand: String(row.brand ?? ''),
    model: String(row.model ?? ''),
    machine: String(row.machine ?? row.machine_name ?? ''),
    machineId: (row.machineId as string | undefined) ?? (row.machine_id as string | undefined),
    issue: String(row.issue ?? row.complaint ?? ''),
    repair: String(row.repair ?? row.repair_work ?? ''),
    partsUsed: (row.partsUsed as string | undefined) ?? (row.parts_used as string | undefined),
    shelfLocation: (row.shelfLocation as string | undefined) ?? (row.shelf_location as string | undefined),
    priority: row.priority as Repair['priority'],
    assignedTo: row.assignedTo as string | undefined,
    expectedDeliveryDate: row.expectedDeliveryDate as string | undefined,
    status: normalizeWorkflowStatus(row.status),
    date: String(row.date ?? row.created_on ?? row.createdAt ?? row.created_at ?? ''),
    completionDate: row.completionDate as string | undefined,
    deliveryDate: row.deliveryDate as string | undefined,
    archivedDate: row.archivedDate as string | undefined,
    price: Number(row.price ?? 0),
    notes: String(row.notes ?? row.note ?? ''),
    paymentStatus: String(row.paymentStatus ?? row.payment_status ?? 'Open') as Repair['paymentStatus'],
    paymentMethod: (row.paymentMethod as Repair['paymentMethod'] | undefined) ?? (row.payment_method as Repair['paymentMethod'] | undefined),
    counterNote: (row.counterNote as string | undefined) ?? (row.counter_note as string | undefined),
    history: parsedHistory as Repair['history'],
    createdAt: (row.createdAt as string | undefined) ?? (row.created_at as string | undefined),
    updatedAt: (row.updatedAt as string | undefined) ?? (row.updated_at as string | undefined),
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const supabase = getSupabase();
  const orderCandidates = ['name', 'full_name', 'customer_name', 'naam', 'klantnaam', 'first_name', 'voornaam', 'createdAt', 'created_at'];

  for (const orderColumn of orderCandidates) {
    const { data, error } = await supabase.from('customers').select('*').order(orderColumn, { ascending: true });
    if (!error) {
      return ((data ?? []) as RawRow[]).map(normalizeCustomer);
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }
  }

  const { data, error } = await supabase.from('customers').select('*');
  if (error) throw new Error(error.message);
  return ((data ?? []) as RawRow[]).map(normalizeCustomer);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeCustomer(data as RawRow) : null;
}

export async function getCustomerMachines(customerId: string): Promise<Machine[]> {
  const supabase = getSupabase();
  const keyCandidates = ['customerId', 'customer_id'];
  const orderCandidates = ['name', 'machine_name', 'naam', 'brand', 'model', 'createdAt', 'created_at'];
  let lastError: { message?: string } | null = null;

  for (const key of keyCandidates) {
    for (const orderColumn of orderCandidates) {
      const { data, error } = await supabase.from('machines').select('*').eq(key, customerId).order(orderColumn, { ascending: true });
      if (!error) {
        return ((data ?? []) as RawRow[]).map(normalizeMachine);
      }

      if (!isMissingColumnError(error)) {
        lastError = error;
        break;
      }
    }

    const { data, error } = await supabase.from('machines').select('*').eq(key, customerId);
    if (!error) {
      return ((data ?? []) as RawRow[]).map(normalizeMachine);
    }
    if (!isMissingColumnError(error)) {
      lastError = error;
    }
  }

  if (lastError) {
    throw new Error(lastError.message);
  }

  return [];
}

export async function getCustomerRepairs(customerId: string): Promise<Repair[]> {
  const supabase = getSupabase();
  const keyCandidates = ['customerId', 'customer_id'];
  const orderCandidates = ['date', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];
  let lastError: { message?: string } | null = null;

  for (const key of keyCandidates) {
    for (const orderColumn of orderCandidates) {
      const { data, error } = await supabase.from('repairs').select('*').eq(key, customerId).order(orderColumn, { ascending: false });
      if (!error) {
        return ((data ?? []) as RawRow[]).map(normalizeRepair).filter((repair) => repair.status !== 'VOORAANMELDING');
      }

      if (!isMissingColumnError(error)) {
        lastError = error;
        break;
      }
    }

    const { data, error } = await supabase.from('repairs').select('*').eq(key, customerId);
    if (!error) {
      return ((data ?? []) as RawRow[]).map(normalizeRepair).filter((repair) => repair.status !== 'VOORAANMELDING');
    }
    if (!isMissingColumnError(error)) {
      lastError = error;
    }
  }

  if (lastError) {
    throw new Error(lastError.message);
  }

  return [];
}

async function findCustomerByColumn(column: string, value: string): Promise<Customer | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('customers').select('*').eq(column, value).maybeSingle();
  if (error && !isMissingColumnError(error)) {
    throw new Error(error.message);
  }
  return data ? normalizeCustomer(data as RawRow) : null;
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  for (const column of ['phone', 'mobilePhone', 'mobile_phone', 'landlinePhone', 'landline_phone']) {
    const customer = await findCustomerByColumn(column, trimmed);
    if (customer) return customer;
  }
  return null;
}

export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;
  for (const column of ['email', 'email_address']) {
    const customer = await findCustomerByColumn(column, trimmed);
    if (customer) return customer;
  }
  return null;
}

export async function findOrCreateCustomer(input: CustomerInput): Promise<Customer> {
  const supabase = getSupabase();
  const payload = buildCustomerPayload(input);
  const primaryPhone = payload.phone as string | undefined;
  const customerName = String(payload.name ?? '').trim();

  if (primaryPhone) {
    const { data: byPhone, error: phoneError } = await supabase.from('customers').select('*').eq('phone', primaryPhone).maybeSingle();
    if (phoneError && !isMissingColumnError(phoneError)) throw new Error(phoneError.message);
    if (byPhone) return normalizeCustomer(byPhone as RawRow);
  }

  const nameColumns = ['name', 'full_name', 'customer_name', 'naam', 'klantnaam'];
  for (const nameColumn of nameColumns) {
    let customerQuery = supabase.from('customers').select('*').eq(nameColumn, customerName);
    if (input.city) {
      customerQuery = customerQuery.eq('city', input.city);
    }

    const { data: byName, error: nameError } = await customerQuery.maybeSingle();
    if (!nameError && byName) {
      return normalizeCustomer(byName as RawRow);
    }
    if (nameError && !isMissingColumnError(nameError)) {
      throw new Error(nameError.message);
    }
  }

  return createCustomer(input);
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const payload = buildCustomerPayload(input);

  if (!String(payload.name ?? '').trim()) {
    throw new Error('Voornaam of achternaam is verplicht om een klant op te slaan.');
  }

  return persistCustomerPayload('insert', buildCustomerWritePayload(payload, { includeCreatedAt: true }));
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
  const payload = buildCustomerPayload(input);

  if (!String(payload.name ?? '').trim()) {
    const existing = await getCustomerById(id);
    if (!existing) {
      throw new Error('Klant niet gevonden.');
    }

    payload.firstName = payload.firstName ?? existing.firstName;
    payload.lastName = payload.lastName ?? existing.lastName;
    payload.name = existing.name;
  }

  if (!String(payload.name ?? '').trim()) {
    throw new Error('Voornaam of achternaam is verplicht om een klant op te slaan.');
  }

  return persistCustomerPayload('update', buildCustomerWritePayload(payload, { includeCreatedAt: false }), id);
}
