import { getSupabase } from '@/lib/supabase-client';
import {
  DEFAULT_COMMUNICATION_TEMPLATES,
  normalizeCommunicationTemplates,
  type CommunicationTemplate,
} from '@/lib/communication-templates';
import {
  DEFAULT_LABEL_PRINTER_SETTINGS,
  normalizeLabelPrinterSettings,
  type LabelPrinterSettings,
} from '@/lib/workshop-settings';

type RawRow = Record<string, unknown>;

type ReadStrategy = {
  keyColumn: 'settingKey' | 'setting_key';
  valueColumn: 'settingValue' | 'setting_value';
  updatedColumn: 'updatedAt' | 'updated_at';
};

const READ_STRATEGIES: ReadStrategy[] = [
  { keyColumn: 'settingKey', valueColumn: 'settingValue', updatedColumn: 'updatedAt' },
  { keyColumn: 'setting_key', valueColumn: 'setting_value', updatedColumn: 'updated_at' },
];

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703'
    || error.code === 'PGRST204'
    || /column .* does not exist/i.test(error.message ?? '')
    || /could not find the '.*' column of '.*' in the schema cache/i.test(error.message ?? '')
  );
}

function normalizeUpdatedAt(row: RawRow, updatedColumn: ReadStrategy['updatedColumn']) {
  const value = row[updatedColumn];
  return typeof value === 'string' ? value : undefined;
}

async function loadSettingValue(settingKey: string) {
  const supabase = getSupabase();

  for (const strategy of READ_STRATEGIES) {
    const { data, error } = await supabase
      .from('workshop_settings')
      .select(`${strategy.keyColumn},${strategy.valueColumn},${strategy.updatedColumn}`)
      .eq(strategy.keyColumn, settingKey)
      .maybeSingle();

    if (!error) {
      if (!data) return null;
      return {
        value: (data as RawRow)[strategy.valueColumn],
        updatedAt: normalizeUpdatedAt(data as RawRow, strategy.updatedColumn),
      };
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }
  }

  return null;
}

async function upsertSettingValue(settingKey: string, settingValue: Record<string, unknown>) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const attempts: Array<{
    payload: Record<string, unknown>;
    onConflict: string;
  }> = [
    {
      payload: {
        settingKey,
        settingValue,
        updatedAt: now,
      },
      onConflict: 'settingKey',
    },
    {
      payload: {
        setting_key: settingKey,
        setting_value: settingValue,
        updated_at: now,
      },
      onConflict: 'setting_key',
    },
  ];

  for (const attempt of attempts) {
    const { error } = await supabase
      .from('workshop_settings')
      .upsert(attempt.payload, { onConflict: attempt.onConflict });

    if (!error) {
      return;
    }

    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }
  }

  throw new Error('Kon workshop_settings niet opslaan vanwege kolom mismatch.');
}

export async function loadLabelPrinterSettings(): Promise<LabelPrinterSettings> {
  const row = await loadSettingValue('label_printer');
  if (!row) {
    return DEFAULT_LABEL_PRINTER_SETTINGS;
  }

  return {
    ...DEFAULT_LABEL_PRINTER_SETTINGS,
    ...normalizeLabelPrinterSettings(row.value),
    updatedAt: row.updatedAt,
  };
}

export async function saveLabelPrinterSettings(input: LabelPrinterSettings): Promise<LabelPrinterSettings> {
  const normalized = normalizeLabelPrinterSettings(input);

  await upsertSettingValue('label_printer', {
    printerName: normalized.printerName,
    enabled: normalized.enabled,
    host: normalized.host,
    port: normalized.port,
    mockMode: normalized.mockMode,
  });

  return loadLabelPrinterSettings();
}

export async function loadCommunicationTemplates(): Promise<CommunicationTemplate[]> {
  const row = await loadSettingValue('communication_templates');
  if (!row) {
    return DEFAULT_COMMUNICATION_TEMPLATES;
  }

  const rawValue = row.value && typeof row.value === 'object'
    ? (row.value as Record<string, unknown>).templates ?? row.value
    : row.value;

  return normalizeCommunicationTemplates(rawValue);
}

export async function saveCommunicationTemplates(input: CommunicationTemplate[]): Promise<CommunicationTemplate[]> {
  const normalized = normalizeCommunicationTemplates(input);

  await upsertSettingValue('communication_templates', {
    templates: normalized,
  });

  const refreshed = await loadSettingValue('communication_templates');
  const raw = refreshed && refreshed.value && typeof refreshed.value === 'object'
    ? (refreshed.value as Record<string, unknown>).templates
    : null;

  return normalizeCommunicationTemplates(raw);
}
