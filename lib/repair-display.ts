type RepairIdentifierLike = {
  id: string;
  repairNumber?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getDisplayRepairNumber(repair: RepairIdentifierLike) {
  const explicit = repair.repairNumber?.trim();
  if (explicit) {
    return explicit;
  }

  const id = String(repair.id ?? '').trim();
  if (!id) {
    return 'Onbekend';
  }

  if (id.toUpperCase().startsWith('R-')) {
    return id;
  }

  if (isUuid(id)) {
    return `R-LEGACY-${id.slice(0, 8).toUpperCase()}`;
  }

  return id;
}