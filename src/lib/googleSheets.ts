import { Appointment, Client, Quote } from '../types';
import { AppSettings } from '../utils/storage';

export interface SheetsDatabasePayload {
  version: string;
  updatedAt: string;
  clients: Client[];
  appointments: Appointment[];
  quotes: Quote[];
  settings?: AppSettings;
}

const SHEET_ID_KEY = 'maicon_google_spreadsheet_id';
const TABS = {
  clients: 'APP_CLIENTES',
  appointments: 'APP_AGENDA',
  quotes: 'APP_ORCAMENTOS',
  config: 'APP_CONFIG',
};

export function getSpreadsheetId(): string {
  const envId = (import.meta as any).env?.VITE_GOOGLE_SPREADSHEET_ID || '';
  if (envId) return envId;
  try { return localStorage.getItem(SHEET_ID_KEY) || ''; } catch { return ''; }
}

export function setSpreadsheetId(idOrUrl: string) {
  let value = idOrUrl.trim();
  const m = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) value = m[1];
  try { localStorage.setItem(SHEET_ID_KEY, value); } catch {}
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function apiFetch(url: string, token: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(token), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Erro ${res.status} ao acessar Google Sheets`);
  }
  return res;
}

async function ensureTabs(spreadsheetId: string, token: string) {
  const meta = await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`,
    token
  );
  const data = await meta.json();
  const existing = new Set((data.sheets || []).map((s: any) => s.properties?.title));
  const missing = Object.values(TABS).filter(t => !existing.has(t));
  if (!missing.length) return;

  await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({ requests: missing.map(title => ({ addSheet: { properties: { title } } })) }),
  });
}

function rowJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

async function replaceValues(spreadsheetId: string, tab: string, values: any[][], token: string) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(tab + '!A:Z')}`;
  await apiFetch(`${base}:clear`, token, { method: 'POST', body: '{}' });
  await apiFetch(`${base}?valueInputOption=RAW`, token, {
    method: 'PUT',
    body: JSON.stringify({ range: `${tab}!A:Z`, majorDimension: 'ROWS', values }),
  });
}

export async function saveDatabaseToGoogleSheets(
  payload: SheetsDatabasePayload,
  accessToken: string,
  spreadsheetId = getSpreadsheetId()
): Promise<void> {
  if (!spreadsheetId) throw new Error('Informe o link ou ID da sua planilha Google.');
  await ensureTabs(spreadsheetId, accessToken);

  const clientRows = [
    ['ID','NOME','CONTATO','ENDERECO','BAIRRO','CIDADE','N_SERIE','OS','OBS','CRIADO_EM','JSON'],
    ...payload.clients.map(c => [c.id,c.name,c.phone,c.address,c.neighborhood || '',c.city || '',c.serialNumber || '',c.serviceOrder || '',c.notes || '',c.createdAt,rowJson(c)]),
  ];

  const apptRows = [
    ['ID','DATA','INICIO','FIM','CLIENTE','CONTATO','ENDERECO','BAIRRO','SERVICO','MODELO','VALOR','STATUS','N_SERIE','OS','GOOGLE_EVENT_ID','ATUALIZADO_EM','JSON'],
    ...payload.appointments.map(a => [a.id,a.date,a.startTime,a.endTime || '',a.clientName,a.clientPhone,a.address,a.neighborhood || '',a.serviceTypeName,a.lockModel || '',a.price ?? '',a.status,a.serialNumber || '',a.serviceOrder || '',a.googleEventId || '',a.updatedAt,rowJson(a)]),
  ];

  const quoteRows = [
    ['ID','CODIGO','DATA','CLIENTE','CONTATO','TOTAL','STATUS','ATUALIZADO_EM','JSON'],
    ...payload.quotes.map(q => [q.id,q.code,q.date,q.clientName,q.clientPhone,q.totalAmount,q.status,q.updatedAt,rowJson(q)]),
  ];

  const configRows = [
    ['CHAVE','VALOR'],
    ['VERSION', payload.version],
    ['UPDATED_AT', payload.updatedAt],
    ['SETTINGS_JSON', rowJson(payload.settings || {})],
  ];

  await Promise.all([
    replaceValues(spreadsheetId, TABS.clients, clientRows, accessToken),
    replaceValues(spreadsheetId, TABS.appointments, apptRows, accessToken),
    replaceValues(spreadsheetId, TABS.quotes, quoteRows, accessToken),
    replaceValues(spreadsheetId, TABS.config, configRows, accessToken),
  ]);
}

async function readValues(spreadsheetId: string, range: string, token: string): Promise<any[][]> {
  const res = await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    token
  );
  const data = await res.json();
  return data.values || [];
}

function parseJsonColumn<T>(rows: any[][], index: number): T[] {
  return rows.slice(1).map(row => {
    try { return JSON.parse(row[index] || 'null'); } catch { return null; }
  }).filter(Boolean) as T[];
}

export async function loadDatabaseFromGoogleSheets(
  accessToken: string,
  spreadsheetId = getSpreadsheetId()
): Promise<SheetsDatabasePayload | null> {
  if (!spreadsheetId) throw new Error('Informe o link ou ID da sua planilha Google.');
  await ensureTabs(spreadsheetId, accessToken);

  const [clientRows, apptRows, quoteRows, configRows] = await Promise.all([
    readValues(spreadsheetId, `${TABS.clients}!A:K`, accessToken),
    readValues(spreadsheetId, `${TABS.appointments}!A:Q`, accessToken),
    readValues(spreadsheetId, `${TABS.quotes}!A:I`, accessToken),
    readValues(spreadsheetId, `${TABS.config}!A:B`, accessToken),
  ]);

  if (clientRows.length <= 1 && apptRows.length <= 1 && quoteRows.length <= 1) return null;

  const config = Object.fromEntries(configRows.slice(1).map(r => [r[0], r[1]]));
  let settings: AppSettings | undefined;
  try { settings = config.SETTINGS_JSON ? JSON.parse(config.SETTINGS_JSON) : undefined; } catch {}

  return {
    version: config.VERSION || '3.1',
    updatedAt: config.UPDATED_AT || new Date(0).toISOString(),
    clients: parseJsonColumn<Client>(clientRows, 10),
    appointments: parseJsonColumn<Appointment>(apptRows, 16),
    quotes: parseJsonColumn<Quote>(quoteRows, 8),
    settings,
  };
}
