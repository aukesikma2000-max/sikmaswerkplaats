export type LabelPrinterSettings = {
  printerName: string;
  enabled: boolean;
  host: string;
  port: number;
  mockMode: boolean;
  updatedAt?: string;
};

export const DEFAULT_LABEL_PRINTER_SETTINGS: LabelPrinterSettings = {
  printerName: '123inkt LW650',
  enabled: false,
  host: '',
  port: 9100,
  mockMode: false,
};

export function normalizeLabelPrinterSettings(value: unknown): LabelPrinterSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const printerName = typeof raw.printerName === 'string' && raw.printerName.trim()
    ? raw.printerName.trim()
    : DEFAULT_LABEL_PRINTER_SETTINGS.printerName;
  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_LABEL_PRINTER_SETTINGS.enabled;
  const host = typeof raw.host === 'string' ? raw.host.trim() : DEFAULT_LABEL_PRINTER_SETTINGS.host;
  const parsedPort = Number(raw.port);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_LABEL_PRINTER_SETTINGS.port;
  const mockMode = typeof raw.mockMode === 'boolean' ? raw.mockMode : DEFAULT_LABEL_PRINTER_SETTINGS.mockMode;

  return {
    printerName,
    enabled,
    host,
    port,
    mockMode,
  };
}
