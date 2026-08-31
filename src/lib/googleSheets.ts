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

export interface OfficialSequences {
  lastMA: number;
  lastOS: number;
  nextMA: number;
  nextOS: number;
}

const SHEET_ID_KEY = 'maicon_google_spreadsheet_id';
const TABS = {
  clients: 'APP_CLIENTES',
  appointments: 'APP_AGENDA',
  quotes: 'APP_ORCAMENTOS',
  config: 'APP_CONFIG',
};

const MAIN_TABS = {
  clients: 'CLIENTES',
  serviceOrders: 'O.S',
  config: 'CONFIGURAÇÕES',
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

async function getSheetTitles(spreadsheetId: string, token: string): Promise<Set<string>> {
  const meta = await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`,
    token
  );
  const data = await meta.json();
  return new Set((data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean));
}

async function ensureTabs(spreadsheetId: string, token: string) {
  const existing = await getSheetTitles(spreadsheetId, token);
  const missing = Object.values(TABS).filter(t => !existing.has(t));
  if (!missing.length) return;

  await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({ requests: missing.map(title => ({ addSheet: { properties: { title } } })) }),
  });
}

async function ensureMainTabs(spreadsheetId: string, token: string) {
  const existing = await getSheetTitles(spreadsheetId, token);
  const missing = Object.values(MAIN_TABS).filter(t => !existing.has(t));
  if (missing.length) {
    throw new Error(`Planilha principal incompleta. Aba(s) não encontrada(s): ${missing.join(', ')}`);
  }
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

async function updateValues(spreadsheetId: string, range: string, values: any[][], token: string, valueInputOption = 'USER_ENTERED') {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`;
  await apiFetch(url, token, {
    method: 'PUT',
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
}

async function appendValues(spreadsheetId: string, range: string, values: any[][], token: string) {
  if (!values.length) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  await apiFetch(url, token, {
    method: 'POST',
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
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
    ['ID','NOME','CONTATO','ENDERECO','BAIRRO','CIDADE','N_SERIE','OS','OBS','CRIADO_EM','JSON','EQUIPAMENTOS'],
    ...payload.clients.map(c => [c.id,c.name,c.phone,c.address,c.neighborhood || '',c.city || '',c.serialNumber || '',c.serviceOrder || '',c.notes || '',c.createdAt,rowJson(c),(c.equipment || []).map(e => `${e.serialNumber}${e.model ? ` - ${e.model}` : ''}`).join(' | ')]),
  ];

  const apptRows = [
    ['ID','DATA','INICIO','FIM','CLIENTE','CONTATO','ENDERECO','BAIRRO','SERVICO','MODELO','VALOR','STATUS','N_SERIE','OS','GOOGLE_EVENT_ID','ATUALIZADO_EM','JSON','EQUIPAMENTOS'],
    ...payload.appointments.map(a => [a.id,a.date,a.startTime,a.endTime || '',a.clientName,a.clientPhone,a.address,a.neighborhood || '',a.serviceTypeName,a.lockModel || '',a.price ?? '',a.status,a.serialNumber || '',a.serviceOrder || '',a.googleEventId || '',a.updatedAt,rowJson(a),(a.equipment || []).map(e => `${e.serialNumber}${e.serviceTypeName ? ` - ${e.serviceTypeName}` : ''}${e.model ? ` - ${e.model}` : ''}`).join(' | ')]),
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

function seq(value: unknown): number {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function formatMA(n: number) { return `MA-${String(n).padStart(6, '0')}`; }
function formatOS(n: number) { return `OS-${String(n).padStart(6, '0')}`; }

/**
 * Lê a numeração REAL das abas principais e também respeita o maior número
 * já consumido localmente. Assim a Agenda nunca volta a usar um MA/OS antigo.
 */
export async function getOfficialSequences(
  accessToken: string,
  spreadsheetId = getSpreadsheetId(),
  minimumLastMA = 0,
  minimumLastOS = 0
): Promise<OfficialSequences> {
  if (!spreadsheetId) throw new Error('Planilha Google não configurada.');
  await ensureMainTabs(spreadsheetId, accessToken);

  const [clientRows, osRows] = await Promise.all([
    readValues(spreadsheetId, `${MAIN_TABS.clients}!A2:B`, accessToken),
    readValues(spreadsheetId, `${MAIN_TABS.serviceOrders}!A2:A`, accessToken),
  ]);

  const maNumbers = clientRows.map(r => seq(r[0]));
  const osNumbers = [
    ...clientRows.map(r => seq(r[1])),
    ...osRows.map(r => seq(r[0])),
  ];

  const lastMA = Math.max(minimumLastMA, 0, ...maNumbers);
  const lastOS = Math.max(minimumLastOS, 0, ...osNumbers);
  return { lastMA, lastOS, nextMA: lastMA + 1, nextOS: lastOS + 1 };
}

function paymentLabel(value?: Appointment['paymentMethod']) {
  const labels: Record<string, string> = {
    pix: 'Pix',
    cartao_credito: 'Cartão de crédito',
    cartao_debito: 'Cartão de débito',
    dinheiro: 'Dinheiro',
    faturado: 'Faturado',
    a_combinar: 'A combinar',
  };
  return value ? (labels[value] || value) : '';
}

/**
 * Grava um atendimento concluído nas abas oficiais CLIENTES e O.S.
 * É idempotente: antes de inserir, confere os MA/OS já existentes para não duplicar.
 */
export async function syncCompletedAppointmentToMainSheets(
  appointment: Appointment,
  accessToken: string,
  spreadsheetId = getSpreadsheetId()
): Promise<void> {
  if (!spreadsheetId) throw new Error('Planilha Google não configurada.');
  await ensureMainTabs(spreadsheetId, accessToken);

  const [clientRows, osRows] = await Promise.all([
    readValues(spreadsheetId, `${MAIN_TABS.clients}!A2:B`, accessToken),
    readValues(spreadsheetId, `${MAIN_TABS.serviceOrders}!A2:A`, accessToken),
  ]);

  const existingMA = new Set(clientRows.map(r => String(r[0] || '').trim()).filter(Boolean));
  const existingOS = new Set([
    ...clientRows.map(r => String(r[1] || '').trim()),
    ...osRows.map(r => String(r[0] || '').trim()),
  ].filter(Boolean));

  const equipment = appointment.equipment || [];
  const clientAppendRows = equipment
    .filter(eq => eq.serialNumber && !existingMA.has(eq.serialNumber))
    .map(eq => [
      eq.serialNumber,                         // A Nº Série
      appointment.serviceOrder || '',          // B OS
      appointment.date || '',                  // C Data Instalação
      appointment.clientName || '',            // D Cliente
      appointment.clientPhone || '',           // E Contato
      appointment.address || '',               // F Endereço
      '',                                       // G Marca (ainda não separada no app)
      eq.model || '',                           // H Modelo
      eq.serviceTypeName || appointment.serviceTypeName || '', // I Serviço
      '',                                       // J Garantia Instalação
      '',                                       // K Garantia vence
      'Ativa',                                  // L Status
      '',                                       // M PDF OS (gerado pelo sistema antigo depois)
      [eq.description, appointment.notes].filter(Boolean).join(' | '), // N Observações
      '',                                       // O Foto
      '',                                       // P Tipo de fornecimento
      '',                                       // Q Fornecedor
      '',                                       // R NF / Comprovante
      '',                                       // S Garantia do Produto
      '',                                       // T QR Code
    ]);

  if (clientAppendRows.length) {
    await appendValues(spreadsheetId, `${MAIN_TABS.clients}!A:T`, clientAppendRows, accessToken);
  }

  if (appointment.serviceOrder && !existingOS.has(appointment.serviceOrder)) {
    const serials = equipment.map(eq => eq.serialNumber).filter(Boolean).join(' | ');
    const serviceNames = equipment.length
      ? equipment.map(eq => eq.serviceTypeName || appointment.serviceTypeName).filter(Boolean).join(' | ')
      : appointment.serviceTypeName;
    const models = equipment.map(eq => eq.model).filter(Boolean).join(' | ');
    const equipmentSummary = equipment.length
      ? `${equipment.length} equipamento(s)`
      : 'Serviço sem equipamento cadastrado';

    await appendValues(spreadsheetId, `${MAIN_TABS.serviceOrders}!A:M`, [[
      appointment.serviceOrder,                // A N° O.S
      serials,                                  // B N° Série
      appointment.date || '',                   // C Data
      appointment.clientName || '',             // D Cliente
      appointment.clientPhone || '',            // E Contato
      serviceNames || appointment.serviceTypeName || '', // F Serviço
      equipmentSummary,                         // G Equipamento
      models,                                   // H Marca/Modelo
      appointment.price ?? '',                  // I Valor
      paymentLabel(appointment.paymentMethod),  // J Forma de Pagamento
      'Concluído',                              // K Status
      '',                                       // L Garantia
      [appointment.description, appointment.notes].filter(Boolean).join(' | '), // M Observações
    ]], accessToken);
  }

  const maNumbers = equipment.map(eq => seq(eq.serialNumber)).filter(Boolean);
  const lastMA = Math.max(0, ...maNumbers, ...clientRows.map(r => seq(r[0])));
  const lastOS = Math.max(seq(appointment.serviceOrder), ...clientRows.map(r => seq(r[1])), ...osRows.map(r => seq(r[0])));
  const nextMA = lastMA + 1;
  const nextOS = lastOS + 1;

  // Mantém compatibilidade com os dois blocos de configuração já existentes na planilha.
  await Promise.all([
    updateValues(spreadsheetId, `${MAIN_TABS.config}!B1:B2`, [[formatMA(lastMA)], [formatMA(nextMA)]], accessToken),
    updateValues(spreadsheetId, `${MAIN_TABS.config}!D8:D9`, [[nextOS], [formatMA(nextMA)]], accessToken),
  ]);
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
    version: config.VERSION || '3.7',
    updatedAt: config.UPDATED_AT || new Date(0).toISOString(),
    clients: parseJsonColumn<Client>(clientRows, 10),
    appointments: parseJsonColumn<Appointment>(apptRows, 16),
    quotes: parseJsonColumn<Quote>(quoteRows, 8),
    settings,
  };
}
