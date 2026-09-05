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
    const googleMessage = body?.error?.message || body?.error?.status || '';
    throw new Error(`Google Sheets ${res.status}${googleMessage ? `: ${googleMessage}` : ''}`);
  }
  return res;
}

function syncStageError(stage: string, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err || 'erro desconhecido');
  throw new Error(`${stage}: ${message}`);
}

async function getSheetTitles(spreadsheetId: string, token: string): Promise<string[]> {
  const meta = await apiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`,
    token
  );
  const data = await meta.json();
  return (data.sheets || []).map((s: any) => String(s.properties?.title || '')).filter(Boolean);
}


function quoteSheetTitle(title: string) {
  // A API do Google Sheets exige aspas em nomes com ponto, espaços, acentos etc.
  // Também cobre o caso da aba CONFIGURAÇÕES ter um espaço no fim do nome.
  return `'${title.replace(/'/g, "''")}'`;
}

function sheetRange(tab: string, range: string) {
  return `${quoteSheetTitle(tab)}!${range}`;
}

function normalizeTabTitle(value: string) {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function resolveTabTitle(titles: string[], wanted: string): string | null {
  const exact = titles.find(t => t === wanted);
  if (exact) return exact;
  const normalizedWanted = normalizeTabTitle(wanted);
  return titles.find(t => normalizeTabTitle(t) === normalizedWanted) || null;
}

async function ensureTabs(spreadsheetId: string, token: string) {
  const titles = await getSheetTitles(spreadsheetId, token);
  const missing = Object.values(TABS).filter(t => !resolveTabTitle(titles, t));
  if (!missing.length) return;

  await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({ requests: missing.map(title => ({ addSheet: { properties: { title } } })) }),
  });
}

async function resolveMainTabs(spreadsheetId: string, token: string) {
  const titles = await getSheetTitles(spreadsheetId, token);
  const resolved = {
    clients: resolveTabTitle(titles, MAIN_TABS.clients),
    serviceOrders: resolveTabTitle(titles, MAIN_TABS.serviceOrders),
    config: resolveTabTitle(titles, MAIN_TABS.config),
  };
  const missing: string[] = [];
  if (!resolved.clients) missing.push(MAIN_TABS.clients);
  if (!resolved.serviceOrders) missing.push(MAIN_TABS.serviceOrders);
  if (!resolved.config) missing.push(MAIN_TABS.config);
  if (missing.length) throw new Error(`Planilha principal incompleta. Aba(s) não encontrada(s): ${missing.join(', ')}`);
  return resolved as { clients: string; serviceOrders: string; config: string };
}

function rowJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

async function replaceValues(spreadsheetId: string, tab: string, values: any[][], token: string) {
  const fullRange = sheetRange(tab, 'A:Z');
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(fullRange)}`;
  await apiFetch(`${base}:clear`, token, { method: 'POST', body: '{}' });
  await apiFetch(`${base}?valueInputOption=RAW`, token, {
    method: 'PUT',
    body: JSON.stringify({ range: sheetRange(tab, 'A:Z'), majorDimension: 'ROWS', values }),
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

function normalizeHeader(value: unknown) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function columnNumberToLetter(columnNumber: number) {
  let n = columnNumber;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

async function ensureOriginalProductSerialColumn(spreadsheetId: string, clientsTab: string, token: string): Promise<string> {
  const headerRows = await readValues(spreadsheetId, sheetRange(clientsTab, 'A1:AZ1'), token);
  const headers = headerRows[0] || [];
  const wanted = new Set([
    'NSERIEORIGINAL',
    'NSERIEORIGINALPRODUTO',
    'NUMERODESERIEORIGINAL',
    'SERIEORIGINAL',
    'SERIEORIGINALPRODUTO',
  ]);
  const existingIndex = headers.findIndex(h => wanted.has(normalizeHeader(h)));
  if (existingIndex >= 0) return columnNumberToLetter(existingIndex + 1);

  // U e V já são usados pelos filtros da planilha atual. A partir de W usamos a primeira coluna vazia.
  let targetIndex = 22; // W, índice base zero
  while (targetIndex < headers.length && String(headers[targetIndex] || '').trim()) targetIndex++;
  const letter = columnNumberToLetter(targetIndex + 1);
  await updateValues(spreadsheetId, sheetRange(clientsTab, `${letter}1`), [['Nº Série Original Produto']], token);
  return letter;
}

/**
 * Lê a numeração REAL das abas principais e reconcilia com registros locais.
 * Um número local só eleva a sequência quando estiver próximo do número oficial.
 * Isso mantém pendências recentes seguras, mas ignora saltos corrompidos como
 * MA-001000 quando a planilha oficial ainda está na faixa de MA-000040.
 */

export async function getClientsRootFolderId(
  accessToken: string,
  spreadsheetId = getSpreadsheetId()
): Promise<string> {
  if (!spreadsheetId) throw new Error('Planilha Google não configurada.');
  const tabs = await resolveMainTabs(spreadsheetId, accessToken);
  const rows = await readValues(spreadsheetId, sheetRange(tabs.config, 'A1:F40'), accessToken);
  for (const row of rows) {
    for (let i = 0; i < row.length - 1; i++) {
      if (normalizeHeader(row[i]) === 'PASTACLIENTES') {
        const value = String(row[i + 1] || '').trim();
        if (value) return value;
      }
    }
  }
  throw new Error('PASTA_CLIENTES não encontrada na aba CONFIGURAÇÕES.');
}

export async function getOfficialSequences(
  accessToken: string,
  spreadsheetId = getSpreadsheetId(),
  minimumLastMA = 0,
  minimumLastOS = 0
): Promise<OfficialSequences> {
  if (!spreadsheetId) throw new Error('Planilha Google não configurada.');
  const tabs = await resolveMainTabs(spreadsheetId, accessToken);

  const [clientRows, osRows] = await Promise.all([
    readValues(spreadsheetId, sheetRange(tabs.clients, 'A2:B'), accessToken),
    readValues(spreadsheetId, sheetRange(tabs.serviceOrders, 'A2:A'), accessToken),
  ]);

  const maNumbers = clientRows.map(r => seq(r[0]));
  const osNumbers = [
    ...clientRows.map(r => seq(r[1])),
    ...osRows.map(r => seq(r[0])),
  ];

  // Ignora saltos claramente acidentais de testes antigos. Exemplo real: a sequência
  // estava na faixa 0000XX e alguns testes gravaram 00100X. Não apagamos essas linhas
  // da planilha; apenas impedimos que elas passem a comandar a próxima numeração.
  const highestPlausibleSequence = (values: number[]) => {
    const sorted = Array.from(new Set(values.filter(n => Number.isFinite(n) && n > 0))).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    let last = sorted[0];
    for (let i = 1; i < sorted.length; i += 1) {
      const current = sorted[i];
      const hugeJump = current - last >= 250 && current >= Math.max(1000, last * 3);
      if (hugeJump) break;
      last = current;
    }
    return last;
  };

  const sheetLastMA = highestPlausibleSequence(maNumbers);
  const sheetLastOS = highestPlausibleSequence(osNumbers);

  // A planilha oficial é a fonte de verdade da numeração.
  // Contadores locais podem ter sido contaminados por testes antigos (ex.: 001000)
  // e não podem mais elevar a sequência quando a planilha principal está acessível.
  // Os parâmetros minimumLastMA/minimumLastOS são mantidos apenas por compatibilidade
  // com chamadas antigas desta função.
  void minimumLastMA;
  void minimumLastOS;

  const lastMA = sheetLastMA;
  const lastOS = sheetLastOS;
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
  if (!spreadsheetId) throw new Error('Configuração: Planilha Google não configurada.');

  let tabs: { clients: string; serviceOrders: string; config: string };
  try {
    tabs = await resolveMainTabs(spreadsheetId, accessToken);
  } catch (err) {
    syncStageError('Localização das abas CLIENTES/O.S/CONFIGURAÇÕES', err);
  }

  let clientRows: any[][] = [];
  let osRows: any[][] = [];
  try {
    [clientRows, osRows] = await Promise.all([
      readValues(spreadsheetId, sheetRange(tabs.clients, 'A2:B'), accessToken),
      readValues(spreadsheetId, sheetRange(tabs.serviceOrders, 'A2:A'), accessToken),
    ]);
  } catch (err) {
    syncStageError('Leitura da planilha principal', err);
  }

  const existingMA = new Set(clientRows.map(r => String(r[0] || '').trim()).filter(Boolean));
  const existingOS = new Set([
    ...clientRows.map(r => String(r[1] || '').trim()),
    ...osRows.map(r => String(r[0] || '').trim()),
  ].filter(Boolean));

  const equipment = appointment.equipment || [];
  let originalSerialColumn = 'W';
  try {
    originalSerialColumn = await ensureOriginalProductSerialColumn(spreadsheetId, tabs.clients, accessToken);
  } catch (err) {
    syncStageError('Preparação da coluna Nº Série Original Produto', err);
  }

  const clientAppendItems = equipment
    .filter(eq => eq.serialNumber && !existingMA.has(eq.serialNumber))
    .map(eq => ({
      equipment: eq,
      row: [
        eq.serialNumber,
        appointment.serviceOrder || '',
        appointment.date || '',
        appointment.clientName || '',
        appointment.clientPhone || '',
        appointment.address || '',
        '',
        eq.model || '',
        eq.serviceTypeName || appointment.serviceTypeName || '',
        appointment.installationWarranty || '',
        '',
        'Ativa',
        '',
        [eq.description, appointment.notes].filter(Boolean).join(' | '),
        (eq.photoUrls || appointment.photoUrls || []).join(' | '),
        eq.productSupplyType || '',
        eq.supplier || '',
        eq.invoiceProof || '',
        eq.productWarranty || '',
        '',
      ],
    }));

  if (clientAppendItems.length) {
    try {
      const clientColA = await readValues(spreadsheetId, sheetRange(tabs.clients, 'A2:A'), accessToken);
      const usedRows = new Set<number>();
      clientColA.forEach((r, index) => { if (String(r[0] || '').trim()) usedRows.add(index + 2); });
      let candidateRow = 2;
      for (const item of clientAppendItems) {
        const row = item.row;
        while (usedRows.has(candidateRow)) candidateRow++;
        await updateValues(spreadsheetId, sheetRange(tabs.clients, `A${candidateRow}:J${candidateRow}`), [row.slice(0, 10)], accessToken);
        await updateValues(spreadsheetId, sheetRange(tabs.clients, `M${candidateRow}:T${candidateRow}`), [row.slice(12, 20)], accessToken);
        if (item.equipment.manufacturerSerialNumber) {
          await updateValues(spreadsheetId, sheetRange(tabs.clients, `${originalSerialColumn}${candidateRow}`), [[item.equipment.manufacturerSerialNumber]], accessToken);
        }
        usedRows.add(candidateRow);
        candidateRow++;
      }
    } catch (err) {
      syncStageError('Gravação na aba CLIENTES', err);
    }
  }

  if (appointment.serviceOrder && !existingOS.has(appointment.serviceOrder)) {
    try {
      const serials = equipment.map(eq => eq.serialNumber).filter(Boolean).join(' | ');
      const serviceNames = equipment.length
        ? equipment.map(eq => eq.serviceTypeName || appointment.serviceTypeName).filter(Boolean).join(' | ')
        : appointment.serviceTypeName;
      const models = equipment.map(eq => eq.model).filter(Boolean).join(' | ');
      const equipmentSummary = equipment.length
        ? `${equipment.length} equipamento(s)`
        : 'Serviço sem equipamento cadastrado';

      const osRow = [
        appointment.serviceOrder,
        serials,
        appointment.date || '',
        appointment.clientName || '',
        appointment.clientPhone || '',
        serviceNames || appointment.serviceTypeName || '',
        equipmentSummary,
        models,
        appointment.price ?? '',
        paymentLabel(appointment.paymentMethod),
        'Concluído',
        appointment.installationWarranty || '',
        [appointment.description, appointment.notes].filter(Boolean).join(' | '),
      ];
      const osColA = await readValues(spreadsheetId, sheetRange(tabs.serviceOrders, 'A2:A'), accessToken);
      let osTargetRow = 2;
      while (String(osColA[osTargetRow - 2]?.[0] || '').trim()) osTargetRow++;
      await updateValues(spreadsheetId, sheetRange(tabs.serviceOrders, `A${osTargetRow}:M${osTargetRow}`), [osRow], accessToken);
    } catch (err) {
      syncStageError('Gravação na aba O.S', err);
    }
  }

  const maNumbers = equipment.map(eq => seq(eq.serialNumber)).filter(Boolean);
  const lastMA = Math.max(0, ...maNumbers, ...clientRows.map(r => seq(r[0])));
  const lastOS = Math.max(seq(appointment.serviceOrder), ...clientRows.map(r => seq(r[1])), ...osRows.map(r => seq(r[0])));
  const nextMA = lastMA + 1;
  const nextOS = lastOS + 1;

  // A atualização dos contadores não deve desfazer uma gravação de CLIENTES/O.S já concluída.
  // Se falhar, devolvemos o estágio exato para diagnóstico, mas o reenvio é idempotente e não duplica MA/OS.
  try {
    await Promise.all([
      updateValues(spreadsheetId, sheetRange(tabs.config, 'B1'), [[formatMA(lastMA)]], accessToken),
      updateValues(spreadsheetId, sheetRange(tabs.config, 'D8:D9'), [[nextOS], [formatMA(nextMA)]], accessToken),
    ]);
  } catch (err) {
    syncStageError('Atualização da aba CONFIGURAÇÕES', err);
  }
}

export async function loadDatabaseFromGoogleSheets(
  accessToken: string,
  spreadsheetId = getSpreadsheetId()
): Promise<SheetsDatabasePayload | null> {
  if (!spreadsheetId) throw new Error('Informe o link ou ID da sua planilha Google.');
  await ensureTabs(spreadsheetId, accessToken);

  const [clientRows, apptRows, quoteRows, configRows] = await Promise.all([
    readValues(spreadsheetId, sheetRange(TABS.clients, 'A:K'), accessToken),
    readValues(spreadsheetId, sheetRange(TABS.appointments, 'A:Q'), accessToken),
    readValues(spreadsheetId, sheetRange(TABS.quotes, 'A:I'), accessToken),
    readValues(spreadsheetId, sheetRange(TABS.config, 'A:B'), accessToken),
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
