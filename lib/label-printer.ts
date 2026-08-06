import net from 'node:net';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import { loadLabelPrinterSettings } from '@/lib/repositories/workshop-settings';
import type { Repair } from '@/types/repair';

export type LabelPrintResult = {
  ok: boolean;
  printerTarget: string;
  printedAt: string;
};

type EffectiveLabelPrinterSettings = {
  enabled: boolean;
  host: string;
  port: number;
  mockMode: boolean;
};

function zplEscape(input: string) {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\^/g, ' ')
    .replace(/~/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function buildRepairLabelZpl(repair: Repair) {
  const repairNumber = zplEscape(getDisplayRepairNumber(repair));
  const customer = zplEscape(repair.customer || 'Onbekende klant');
  const city = zplEscape(repair.city || '-');
  const phone = zplEscape(repair.phone || '-');

  return [
    '^XA',
    '^PW600',
    '^LL360',
    '^FO24,20^A0N,46,46^FDREPARATIE^FS',
    `^FO24,78^A0N,54,54^FD${repairNumber}^FS`,
    `^FO24,152^A0N,36,36^FD${customer}^FS`,
    `^FO24,198^A0N,30,30^FD${city}^FS`,
    `^FO24,236^A0N,30,30^FD${phone}^FS`,
    '^FO24,286^A0N,24,24^FDSikma Werkplaats^FS',
    '^FO340,276^BY2,2,70^BCN,70,Y,N,N^FDQA,REPAIR^FS',
    '^XZ',
  ].join('\n');
}

async function sendRawToTcpPrinter(host: string, port: number, payload: string) {
  await new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    }

    socket.setTimeout(5000);
    socket.once('timeout', () => finish(new Error('Timeout bij verbinden met de labelprinter.')));
    socket.once('error', (error) => finish(error instanceof Error ? error : new Error('Onbekende printerfout.')));

    socket.connect(port, host, () => {
      socket.write(payload, (error) => {
        if (error) {
          finish(error instanceof Error ? error : new Error('Kon labeldata niet versturen.'));
          return;
        }
        socket.end();
      });
    });

    socket.once('close', () => {
      if (!settled) finish();
    });
  });
}

function buildTestLabelZpl() {
  const printedAt = new Date().toLocaleString('nl-NL');
  return [
    '^XA',
    '^PW600',
    '^LL340',
    '^FO24,24^A0N,44,44^FDTESTLABEL^FS',
    '^FO24,88^A0N,32,32^FD123inkt LW650^FS',
    `^FO24,138^A0N,28,28^FD${zplEscape(printedAt)}^FS`,
    '^FO24,186^A0N,26,26^FDSikma Werkplaats^FS',
    '^FO24,224^A0N,24,24^FDControleer uitlijning en leesbaarheid^FS',
    '^XZ',
  ].join('\n');
}

async function resolveLabelPrinterSettings(): Promise<EffectiveLabelPrinterSettings> {
  const savedSettings = await loadLabelPrinterSettings().catch(() => null);

  return {
    enabled: savedSettings?.enabled ?? true,
    host: savedSettings?.host?.trim() || process.env.LABEL_PRINTER_HOST?.trim() || '',
    port: Number(savedSettings?.port ?? process.env.LABEL_PRINTER_PORT ?? 9100),
    mockMode: savedSettings?.mockMode ?? (process.env.LABEL_PRINTER_MOCK === 'true'),
  };
}

function validatePrinterSettings(settings: EffectiveLabelPrinterSettings, options?: { allowDisabled?: boolean }) {
  if (!options?.allowDisabled && !settings.enabled) {
    throw new Error('Labelprinter staat uitgeschakeld in Instellingen.');
  }

  if (!settings.host && !settings.mockMode) {
    throw new Error('Geen labelprinter ingesteld. Vul host en poort in bij Instellingen.');
  }

  if (!Number.isFinite(settings.port) || settings.port <= 0) {
    throw new Error('LABEL_PRINTER_PORT is ongeldig.');
  }
}

export async function testLabelPrinterConnection() {
  const settings = await resolveLabelPrinterSettings();
  validatePrinterSettings(settings, { allowDisabled: true });

  if (settings.mockMode) {
    return {
      ok: true,
      printerTarget: 'MOCK',
      checkedAt: new Date().toISOString(),
    };
  }

  await sendRawToTcpPrinter(settings.host, settings.port, '');

  return {
    ok: true,
    printerTarget: `${settings.host}:${settings.port}`,
    checkedAt: new Date().toISOString(),
  };
}

export async function printTestLabel(): Promise<LabelPrintResult> {
  const settings = await resolveLabelPrinterSettings();
  validatePrinterSettings(settings, { allowDisabled: true });

  if (settings.mockMode) {
    return {
      ok: true,
      printerTarget: 'MOCK',
      printedAt: new Date().toISOString(),
    };
  }

  const zpl = buildTestLabelZpl();
  await sendRawToTcpPrinter(settings.host, settings.port, zpl);

  return {
    ok: true,
    printerTarget: `${settings.host}:${settings.port}`,
    printedAt: new Date().toISOString(),
  };
}

export async function printRepairLabel(repair: Repair): Promise<LabelPrintResult> {
  const settings = await resolveLabelPrinterSettings();
  validatePrinterSettings(settings);

  if (settings.mockMode) {
    return {
      ok: true,
      printerTarget: 'MOCK',
      printedAt: new Date().toISOString(),
    };
  }

  const zpl = buildRepairLabelZpl(repair);
  await sendRawToTcpPrinter(settings.host, settings.port, zpl);

  return {
    ok: true,
    printerTarget: `${settings.host}:${settings.port}`,
    printedAt: new Date().toISOString(),
  };
}
