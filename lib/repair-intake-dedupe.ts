import type { Customer } from '@/types/repair';

export function detectPossibleDuplicateIntake(input: {
  customerName: string;
  primaryPhone?: string;
  serialNumber?: string;
  customers: Customer[];
}) {
  const normalizedName = input.customerName.trim().toLowerCase();
  const normalizedPhone = (input.primaryPhone || '').trim().toLowerCase();
  const normalizedSerial = (input.serialNumber || '').trim().toLowerCase();

  if (!normalizedName || (!normalizedPhone && !normalizedSerial)) {
    return { hasWarning: false, message: '' };
  }

  const matches = input.customers.filter((customer) => {
    const sameName = (customer.name || '').trim().toLowerCase() === normalizedName;
    const samePhone = normalizedPhone && (customer.phone || '').trim().toLowerCase() === normalizedPhone;
    return Boolean(sameName || samePhone);
  });

  if (!matches.length) {
    return { hasWarning: false, message: '' };
  }

  return {
    hasWarning: true,
    message: `Mogelijke dubbele intake (${matches.length} klantmatch${matches.length > 1 ? 'es' : ''}). Controleer bestaand dossier eerst.`,
  };
}
