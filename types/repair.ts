export type RepairStatus =
  | 'NEW'
  | 'VOORAANMELDING'
  | 'IN_WORKSHOP'
  | 'WAITING_FOR_CUSTOMER'
  | 'WAITING_FOR_PARTS'
  | 'READY'
  | 'COMPLETED';

export type RepairOutcome =
  | 'REPAIRED'
  | 'MAINTENANCE_DONE'
  | 'WARRANTY'
  | 'NEW_MACHINE_SOLD'
  | 'MACHINE_DISCARDED';

export type PaymentStatus = 'Open' | 'Betaald' | 'Betaalt later';

export type PaymentMethod = 'Pin' | 'Contant' | 'Anders';

export type RepairPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type WorkshopUserRole = 'Administrator' | 'Repair Technician' | 'Front Desk';

export type CommunicationChannel = 'WHATSAPP' | 'EMAIL' | 'PHONE' | 'ONLINE_FORM' | 'INTERNAL_NOTE' | 'SMS' | 'PUSH' | 'LETTER' | 'OTHER';

export type CommunicationType = 'CUSTOMER' | 'INTERNAL' | 'SYSTEM' | 'AUTOMATIC' | 'MANUAL' | 'MARKETING' | 'OTHER';

export type CommunicationStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'LOGGED';

export type CommunicationEvent = {
  id: string;
  customerId?: string;
  repairId?: string;
  machineId?: string;
  channel: CommunicationChannel;
  type?: CommunicationType;
  occurredAt: string;
  actorName?: string;
  actorId?: string;
  subject?: string;
  messageBody?: string;
  status?: CommunicationStatus;
  isAutomatic?: boolean;
  errorMessage?: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type Customer = {
  id: string;
  customerNumber?: string;
  firstName?: string;
  lastName?: string;
  name: string;
  address?: string;
  postalCode?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  phone?: string;
  email?: string;
  city?: string;
  maintenanceReminderOptIn?: boolean;
  nextMaintenanceReminderDate?: string;
  maintenanceConsentDate?: string;
  maintenanceConsentMethod?: string;
  maintenanceConsentEmployee?: string;
  maintenanceReminderStatus?: string;
  maintenanceLastModified?: string;
  maintenanceUnsubscribedAt?: string;
  maintenanceUnsubscribeReason?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MaintenanceReminder = {
  id: string;
  customerId: string;
  repairId?: string;
  plannedFor: string;
  status: 'PLANNED' | 'SENT' | 'CANCELLED';
  channel: 'EMAIL' | 'WHATSAPP' | 'UNKNOWN';
  source: string;
  sentAt?: string;
  cancelledAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MaintenanceServiceAudit = {
  id: string;
  customerId: string;
  repairId?: string;
  eventType: string;
  note?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  actorName?: string;
  actorRole?: string;
  createdAt: string;
};

export type Machine = {
  id: string;
  customerId?: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RepairHistoryEntry = {
  status: RepairStatus;
  timestamp: string;
  user: string;
  note?: string;
};

export type RepairStatusHistory = {
  id: string;
  repairId: string;
  status: RepairStatus;
  note?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
};

export type RepairNote = {
  id: string;
  repairId: string;
  note: string;
  createdAt: string;
  createdBy?: string;
};

export type WorkshopUser = {
  id: string;
  name: string;
  email?: string;
  role: WorkshopUserRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Repair = {
  id: string;
  repairNumber?: string;
  repairGroupId?: string;
  repairOutcome?: RepairOutcome;
  source?: string;
  websiteSubmissionDate?: string;
  websiteSubmissionId?: string;
  convertedToRepair?: boolean;
  convertedAt?: string;
  convertedBy?: string;
  customer: string;
  address?: string;
  phone: string;
  customerId?: string;
  email?: string;
  city: string;
  brand?: string;
  model?: string;
  machine?: string;
  serialNumber?: string;
  machineId?: string;
  issue: string;
  repair: string;
  partsUsed?: string;
  shelfLocation?: string;
  priority?: RepairPriority;
  assignedTo?: string;
  expectedDeliveryDate?: string;
  statusUpdatedAt?: string;
  readyAt?: string;
  nextMaintenanceDate?: string;
  status: RepairStatus;
  date: string;
  completionDate?: string;
  deliveryDate?: string;
  archivedDate?: string;
  price: number;
  notes: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  counterNote?: string;
  history: RepairHistoryEntry[];
  createdAt?: string;
  updatedAt?: string;
};

export type RepairInput = {
  existingCustomerId?: string;
  customer: string;
  address?: string;
  phone: string;
  email?: string;
  city: string;
  brand?: string;
  model?: string;
  machine?: string;
  serialNumber?: string;
  issue: string;
  repair: string;
  partsUsed?: string;
  shelfLocation?: string;
  priority?: RepairPriority;
  assignedTo?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  price?: number;
};

export type PickupRepair = Repair & {};

export type CustomerInput = {
  firstName?: string;
  lastName?: string;
  name?: string;
  address?: string;
  postalCode?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  phone?: string;
  email?: string;
  city?: string;
  maintenanceReminderOptIn?: boolean;
  nextMaintenanceReminderDate?: string;
  maintenanceConsentDate?: string;
  maintenanceConsentMethod?: string;
  maintenanceConsentEmployee?: string;
  maintenanceReminderStatus?: string;
  maintenanceLastModified?: string;
  maintenanceUnsubscribedAt?: string;
  maintenanceUnsubscribeReason?: string;
  notes?: string;
};

export type CommunicationFilter = {
  channel?: CommunicationChannel;
  type?: CommunicationType;
  isAutomatic?: boolean;
};
