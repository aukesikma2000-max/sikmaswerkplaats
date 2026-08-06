"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { canAccessRoute } from '@/lib/access-control';
import { getActorHeaders } from '@/lib/client/request-actor';
import { DEFAULT_COMMUNICATION_TEMPLATES, type CommunicationTemplate } from '@/lib/communication-templates';
import { getCurrentDate, getCurrentLocation } from '@/lib/workshop-info';
import { DEFAULT_WORKSHOP_USER, getActiveWorkshopUserRecord, type WorkshopUser } from '@/lib/active-user';
import { normalizeLabelPrinterSettings } from '@/lib/workshop-settings';

export default function InstellingenPage() {
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);
  const [printerName, setPrinterName] = useState('123inkt LW650');
  const [printerEnabled, setPrinterEnabled] = useState(true);
  const [printerHost, setPrinterHost] = useState('192.168.1.150');
  const [printerPort, setPrinterPort] = useState('9100');
  const [printerMockMode, setPrinterMockMode] = useState(true);
  const [printerSaveState, setPrinterSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [printerMessage, setPrinterMessage] = useState('');
  const [printerStatus, setPrinterStatus] = useState<'unknown' | 'online' | 'offline'>('online');
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isPrintingTestLabel, setIsPrintingTestLabel] = useState(false);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>(DEFAULT_COMMUNICATION_TEMPLATES);
  const [templatesSaveState, setTemplatesSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [templatesMessage, setTemplatesMessage] = useState('');

  useEffect(() => {
    setActiveUser(getActiveWorkshopUserRecord());

    const onUserChange = () => {
      setActiveUser(getActiveWorkshopUserRecord());
    };

    window.addEventListener('sikma-active-user-changed', onUserChange as EventListener);
    window.addEventListener('sikma-users-changed', onUserChange as EventListener);

    return () => {
      window.removeEventListener('sikma-active-user-changed', onUserChange as EventListener);
      window.removeEventListener('sikma-users-changed', onUserChange as EventListener);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPrinterSettings() {
      try {
        const response = await fetch('/api/settings/label-printer', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({ ok: false }));
        if (!response.ok || payload?.ok !== true) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'Kon printerinstellingen niet laden.');
        }

        const settings = normalizeLabelPrinterSettings(payload.settings);
        if (!mounted) return;

        setPrinterName(settings.printerName || '123inkt LW650');
        setPrinterEnabled(settings.enabled);
        setPrinterHost(settings.host);
        setPrinterPort(String(settings.port));
        setPrinterMockMode(settings.mockMode);
          setPrinterStatus(settings.mockMode ? 'online' : 'unknown');
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Kon printerinstellingen niet laden.';
        setPrinterSaveState('error');
        setPrinterMessage(message);
      }
    }

    async function loadCommunicationTemplates() {
      try {
        const response = await fetch('/api/settings/communication-templates', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({ ok: false }));
        if (!response.ok || payload?.ok !== true || !Array.isArray(payload?.templates)) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'Kon templates niet laden.');
        }

        if (!mounted) return;
        setTemplates(payload.templates as CommunicationTemplate[]);
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Kon templates niet laden.';
        setTemplatesSaveState('error');
        setTemplatesMessage(message);
      }
    }

    loadPrinterSettings();
    loadCommunicationTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  if (!canAccessRoute(activeUser.role, '/instellingen')) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Geen toegang</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Instellingen niet beschikbaar</h1>
          <p className="mt-3 text-sm text-slate-600">Met de rol Front Desk is dit scherm niet toegankelijk.</p>
        </Card>
      </PageShell>
    );
  }

  const canManageUsers = canAccessRoute(activeUser.role, '/instellingen/users');
  const canManagePrinter = activeUser.role === 'Administrator';
  const canManageTemplates = activeUser.role === 'Administrator';

  const handleTemplateChange = (templateId: string, field: 'label' | 'subject' | 'messageBody', value: string) => {
    setTemplates((current) => current.map((template) => {
      if (template.id !== templateId) return template;
      return {
        ...template,
        [field]: value,
      };
    }));
    setTemplatesSaveState('idle');
    setTemplatesMessage('');
  };

  const handleSaveTemplates = async () => {
    if (!canManageTemplates || templatesSaveState === 'saving') return;

    const hasInvalidBody = templates.some((template) => !template.messageBody?.trim());
    if (hasInvalidBody) {
      setTemplatesSaveState('error');
      setTemplatesMessage('Elke template moet een berichttekst hebben.');
      return;
    }

    setTemplatesSaveState('saving');
    setTemplatesMessage('');

    try {
      const response = await fetch('/api/settings/communication-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getActorHeaders(),
        },
        body: JSON.stringify({ templates }),
      });
      const payload = await response.json().catch(() => ({ ok: false }));

      if (!response.ok || payload?.ok !== true || !Array.isArray(payload?.templates)) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Templates opslaan mislukt.');
      }

      setTemplates(payload.templates as CommunicationTemplate[]);
      setTemplatesSaveState('saved');
      setTemplatesMessage('Templates opgeslagen. Deze templates zijn nu de centrale bron voor dossieracties.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Templates opslaan mislukt.';
      setTemplatesSaveState('error');
      setTemplatesMessage(message);
    }
  };

  const handleSavePrinterSettings = async () => {
    if (!canManagePrinter || printerSaveState === 'saving') return;

    const normalizedHost = printerHost.trim();
    const parsedPort = Number(printerPort);

    if (printerEnabled && !printerMockMode && !normalizedHost) {
      setPrinterSaveState('error');
      setPrinterMessage('Vul een printer host/IP in of zet testmodus aan.');
      return;
    }

    if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
      setPrinterSaveState('error');
      setPrinterMessage('Poort moet een geldig getal zijn, bijvoorbeeld 9100.');
      return;
    }

    setPrinterSaveState('saving');
    setPrinterMessage('');

    try {
      const response = await fetch('/api/settings/label-printer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getActorHeaders(),
        },
        body: JSON.stringify({
          printerName: printerName.trim() || '123inkt LW650',
          enabled: printerEnabled,
          host: normalizedHost,
          port: parsedPort,
          mockMode: printerMockMode,
        }),
      });
      const payload = await response.json().catch(() => ({ ok: false }));

      if (!response.ok || payload?.ok !== true) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Opslaan van printerinstellingen is mislukt.');
      }

      const saved = normalizeLabelPrinterSettings(payload.settings);

      setPrinterName(saved.printerName || '123inkt LW650');
      setPrinterEnabled(saved.enabled);
      setPrinterHost(saved.host);
      setPrinterPort(String(saved.port));
      setPrinterMockMode(saved.mockMode);
      setPrinterSaveState('saved');
      setPrinterMessage('Printerinstellingen opgeslagen.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Opslaan van printerinstellingen is mislukt.';
      setPrinterSaveState('error');
      setPrinterMessage(message);
    }
  };


  const handleTestPrinterConnection = async () => {
    if (!canManagePrinter || isTestingPrinter) return;

    setIsTestingPrinter(true);
    setPrinterMessage('Printerverbinding wordt getest...');

    try {
      const response = await fetch('/api/labels/printer-test', {
        method: 'POST',
        headers: getActorHeaders(),
      });
      const payload = await response.json().catch(() => ({ ok: false }));

      if (!response.ok || payload?.ok !== true) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Printertest mislukt.');
      }

      setPrinterStatus('online');
      setPrinterSaveState('saved');
      setPrinterMessage(`Printer online (${payload.printerTarget ?? 'onbekende target'}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Printertest mislukt.';
      setPrinterStatus('offline');
      setPrinterSaveState('error');
      setPrinterMessage(message);
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handlePrintTestLabel = async () => {
    if (!canManagePrinter || isPrintingTestLabel) return;

    setIsPrintingTestLabel(true);
    setPrinterMessage('Testlabel wordt verstuurd...');

    try {
      const response = await fetch('/api/labels/test-label', {
        method: 'POST',
        headers: getActorHeaders(),
      });
      const payload = await response.json().catch(() => ({ ok: false }));

      if (!response.ok || payload?.ok !== true) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Testlabel afdrukken mislukt.');
      }

      setPrinterStatus('online');
      setPrinterSaveState('saved');
      setPrinterMessage(`Testlabel verzonden (${payload.printerTarget ?? 'onbekende target'}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Testlabel afdrukken mislukt.';
      setPrinterStatus('offline');
      setPrinterSaveState('error');
      setPrinterMessage(message);
    } finally {
      setIsPrintingTestLabel(false);
    }
  };
  return (
    <PageShell>
      <Card>
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#D4AF37]">Instellingen</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#111111]">Systeeminstellingen</h1>
            <p className="mt-3 text-sm text-slate-600">Eenvoudige instellingen voor de werkplaatsomgeving.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-500">Ingelogde gebruiker</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{activeUser.name}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-500">Rol</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{activeUser.role}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-500">Datum</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{getCurrentDate()}</p>
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-[#F8F8F8] p-6">
            <p className="text-sm font-semibold text-[#111111]">Locatie</p>
            <p className="mt-2 text-sm text-slate-700">Vestiging: {getCurrentLocation()}</p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-[#F8F8F8] p-6">
            <p className="text-sm font-semibold text-[#111111]">Users</p>
            <p className="mt-2 text-sm text-slate-700">
              {canManageUsers
                ? 'Beheer gebruikers, rollen en activatie voor het team.'
                : 'User management is alleen beschikbaar voor de Administrator.'}
            </p>
            <div className="mt-4">
              {canManageUsers ? (
                <Link
                  href="/instellingen/users"
                  className="inline-flex rounded-[14px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111111] transition hover:border-[#D4AF37]"
                >
                  Open Users
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-[#F8F8F8] p-6">
            <p className="text-sm font-semibold text-[#111111]">Labelprinter (123inkt LW650)</p>
            <p className="mt-2 text-sm text-slate-700">
              Alleen administrators kunnen de netwerkprinter instellen voor automatische stickers.
            </p>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Printernaam</label>
              <input
                type="text"
                value={printerName}
                onChange={(event) => setPrinterName(event.target.value)}
                placeholder="123inkt LW650"
                disabled={!canManagePrinter}
                className="w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#D4AF37] disabled:bg-slate-100"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={printerEnabled}
                  onChange={(event) => setPrinterEnabled(event.target.checked)}
                  disabled={!canManagePrinter}
                />
                Printer actief
              </label>

              <label className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={printerMockMode}
                  onChange={(event) => setPrinterMockMode(event.target.checked)}
                  disabled={!canManagePrinter}
                />
                Testmodus (geen fysieke print)
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Printer host/IP</label>
                <input
                  type="text"
                  value={printerHost}
                  onChange={(event) => setPrinterHost(event.target.value)}
                  placeholder="Bijv. 192.168.1.50"
                  disabled={!canManagePrinter}
                  className="w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#D4AF37] disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Poort</label>
                <input
                  type="number"
                  value={printerPort}
                  onChange={(event) => setPrinterPort(event.target.value)}
                  placeholder="9100"
                  disabled={!canManagePrinter}
                  className="w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#D4AF37] disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="mt-4 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="font-semibold text-slate-700">Status</p>
              <p className="mt-1 text-slate-800">
                {printerStatus === 'online' ? '🟢 Printer online' : printerStatus === 'offline' ? '🔴 Printer offline' : '⚪ Status onbekend'}
              </p>
            </div>

            {printerMessage ? (
              <p className={`mt-4 text-sm ${printerSaveState === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
                {printerMessage}
              </p>
            ) : null}

            {canManagePrinter ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Button variant="ghost" onClick={handleTestPrinterConnection} disabled={isTestingPrinter}>
                  {isTestingPrinter ? 'Testen...' : 'Printer testen'}
                </Button>
                <Button variant="secondary" onClick={handlePrintTestLabel} disabled={isPrintingTestLabel}>
                  {isPrintingTestLabel ? 'Versturen...' : 'Testlabel afdrukken'}
                </Button>
                <Button onClick={handleSavePrinterSettings} disabled={printerSaveState === 'saving'}>
                  {printerSaveState === 'saving' ? 'Opslaan...' : 'Printerinstellingen opslaan'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-[#F8F8F8] p-6">
            <p className="text-sm font-semibold text-[#111111]">Berichtentemplates</p>
            <p className="mt-2 text-sm text-slate-700">
              Beheer hier de centrale templates voor klantcommunicatie en interne notities. Deze templates worden in het werkplaatsdossier gebruikt.
            </p>
            <p className="mt-1 text-xs text-slate-500">Voor klantberichten blijft altijd handmatige akkoord vereist voordat iets als verzonden wordt vastgelegd.</p>

            <div className="mt-4 space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="rounded-[14px] border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.8fr]">
                    <label className="text-sm font-semibold text-slate-700">
                      Naam
                      <input
                        type="text"
                        value={template.label}
                        onChange={(event) => handleTemplateChange(template.id, 'label', event.target.value)}
                        disabled={!canManageTemplates}
                        className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                      />
                    </label>

                    <div className="text-sm text-slate-600">
                      <p className="font-semibold text-slate-700">Type</p>
                      <p className="mt-2">{template.tab === 'customer' ? 'Klantcommunicatie' : 'Interne notitie'}</p>
                    </div>

                    <div className="text-sm text-slate-600">
                      <p className="font-semibold text-slate-700">Kanaal</p>
                      <p className="mt-2">{template.channel}</p>
                    </div>
                  </div>

                  <label className="mt-3 block text-sm font-semibold text-slate-700">
                    Onderwerp
                    <input
                      type="text"
                      value={template.subject ?? ''}
                      onChange={(event) => handleTemplateChange(template.id, 'subject', event.target.value)}
                      disabled={!canManageTemplates || template.tab === 'internal'}
                      placeholder={template.tab === 'internal' ? 'Niet van toepassing voor interne notities' : 'Optioneel'}
                      className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                    />
                  </label>

                  <label className="mt-3 block text-sm font-semibold text-slate-700">
                    Berichttekst
                    <textarea
                      rows={4}
                      value={template.messageBody}
                      onChange={(event) => handleTemplateChange(template.id, 'messageBody', event.target.value)}
                      disabled={!canManageTemplates}
                      className="mt-2 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                    />
                  </label>
                </div>
              ))}
            </div>

            {templatesMessage ? (
              <p className={`mt-4 text-sm ${templatesSaveState === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
                {templatesMessage}
              </p>
            ) : null}

            {canManageTemplates ? (
              <div className="mt-4">
                <Button onClick={handleSaveTemplates} disabled={templatesSaveState === 'saving'}>
                  {templatesSaveState === 'saving' ? 'Opslaan...' : 'Templates opslaan'}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
