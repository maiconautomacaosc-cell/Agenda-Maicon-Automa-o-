import { Appointment, Client, Quote } from '../types';
import { AppSettings } from '../utils/storage';

export interface DatabasePayload {
  version: string;
  updatedAt: string;
  clients: Client[];
  appointments: Appointment[];
  quotes: Quote[];
  settings?: AppSettings;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

const DRIVE_FILE_NAME = 'agenda_maicon_database.json';
const DRIVE_BACKUP_PREFIX = 'backup_agenda_maicon_';
const DRIVE_BACKUP_KEEP = 30;

/**
 * Searches for the primary database file in Google Drive
 */
export async function findDriveDatabaseFile(accessToken: string): Promise<DriveFileInfo | null> {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,webViewLink)&spaces=drive`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Erro ${res.status} ao consultar Google Drive`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Saves or updates the complete database directly in Google Drive
 */
export async function saveDatabaseToGoogleDrive(
  data: DatabasePayload,
  accessToken: string
): Promise<{ fileId: string; modifiedTime: string }> {
  const existingFile = await findDriveDatabaseFile(accessToken);
  const jsonContent = JSON.stringify(data, null, 2);

  if (existingFile) {
    // Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonContent,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${res.status} ao atualizar arquivo no Google Drive`);
    }

    const updated = await res.json();
    return {
      fileId: updated.id || existingFile.id,
      modifiedTime: new Date().toISOString(),
    };
  } else {
    // Create new file with multipart upload (metadata + content)
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: 'Banco de Dados Nuvem - Agenda Maicon Automação (100% Gratuito)',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${res.status} ao criar arquivo no Google Drive`);
    }

    const created = await res.json();
    return {
      fileId: created.id,
      modifiedTime: created.modifiedTime || new Date().toISOString(),
    };
  }
}

/**
 * Loads the complete database from Google Drive
 */
export async function loadDatabaseFromGoogleDrive(
  accessToken: string
): Promise<{ data: DatabasePayload | null; fileInfo: DriveFileInfo | null }> {
  const file = await findDriveDatabaseFile(accessToken);
  if (!file) {
    return { data: null, fileInfo: null };
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ${res.status} ao carregar dados do Google Drive`);
  }

  const json = await res.json();
  return {
    data: json as DatabasePayload,
    fileInfo: file,
  };
}

/**
 * Creates a timestamped backup snapshot in Google Drive
 */
export async function createDriveBackupSnapshot(
  data: DatabasePayload,
  accessToken: string,
  reason: string = 'automatico'
): Promise<{ fileId: string; name: string }> {
  const dateFormatted = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeReason = reason.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 35) || 'automatico';
  const fileName = `${DRIVE_BACKUP_PREFIX}${dateFormatted}_${safeReason}.json`;
  const jsonContent = JSON.stringify(data, null, 2);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Backup Histórico da Agenda Maicon Automação criado em ${new Date().toLocaleString('pt-BR')}`,
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime';
  const res = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ${res.status} ao criar backup no Google Drive`);
  }

  const created = await res.json();

  // Mantém um histórico rolante. O backup principal continua separado e é sobrescrito,
  // mas os snapshots não são substituídos até ultrapassar o limite de segurança.
  pruneDriveBackups(accessToken, DRIVE_BACKUP_KEEP).catch(() => null);

  return {
    fileId: created.id,
    name: created.name,
  };
}

/**
 * Lists all previous backup files in Google Drive
 */
export async function listDriveBackups(accessToken: string): Promise<DriveFileInfo[]> {
  const query = encodeURIComponent(`name contains '${DRIVE_BACKUP_PREFIX}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&pageSize=100&fields=files(id,name,createdTime,modifiedTime,size,webViewLink)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.files || [];
}


/**
 * Removes only the oldest automatic snapshots, preserving the newest history.
 * The primary database file is never touched here.
 */
export async function pruneDriveBackups(accessToken: string, keep: number = DRIVE_BACKUP_KEEP): Promise<void> {
  const backups = await listDriveBackups(accessToken);
  const extras = backups.slice(Math.max(1, keep));
  for (const file of extras) {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {}
  }
}

const ATTENDANCE_PHOTO_FOLDER = 'Maicon Automação - Fotos de Atendimentos';

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findOrCreateAttendancePhotoFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `name = '${escapeDriveQuery(ATTENDANCE_PHOTO_FOLDER)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!search.ok) {
    const err = await search.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ${search.status} ao localizar pasta de fotos`);
  }
  const found = await search.json();
  if (found.files?.[0]?.id) return found.files[0].id;

  const create = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: ATTENDANCE_PHOTO_FOLDER,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Fotos registradas ao concluir atendimentos na Agenda Maicon Automação',
    }),
  });
  if (!create.ok) {
    const err = await create.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ${create.status} ao criar pasta de fotos`);
  }
  const created = await create.json();
  return created.id;
}

/**
 * Envia fotos selecionadas na finalização do atendimento para uma pasta própria no Drive.
 * Retorna links privados do Drive; nenhum compartilhamento público é criado.
 */
export async function uploadAppointmentPhotos(
  files: File[],
  accessToken: string,
  reference: string,
  destinationFolderId?: string
): Promise<string[]> {
  if (!files.length) return [];
  const folderId = destinationFolderId || await findOrCreateAttendancePhotoFolder(accessToken);
  const safeRef = String(reference || 'ATENDIMENTO').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const extFromName = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
    const extension = extFromName || (file.type === 'image/png' ? '.png' : '.jpg');
    const name = `${safeRef}_${String(i + 1).padStart(2, '0')}${extension}`;

    const metadataRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        parents: [folderId],
        description: `Foto do atendimento ${reference} - Maicon Automação`,
      }),
    });
    if (!metadataRes.ok) {
      const err = await metadataRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${metadataRes.status} ao criar arquivo de foto`);
    }
    const created = await metadataRes.json();

    const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(created.id)}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${uploadRes.status} ao enviar foto`);
    }
    urls.push(`https://drive.google.com/file/d/${created.id}/view`);
  }

  return urls;
}


export interface ClientDriveStructure {
  folderId: string;
  folderName: string;
  folderUrl: string;
  subfolders: Record<string, string>;
}

const CLIENT_SUBFOLDERS = [
  '01 - Ordem de Serviço',
  '02 - Garantia',
  '03 - Fotos Antes',
  '04 - Fotos Depois',
  '05 - Orçamentos',
  '06 - Documentos',
];

function normalizeDriveName(value: string) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function safeDriveFolderName(value: string) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

async function listChildFolders(parentId: string, accessToken: string): Promise<Array<{id:string;name:string}>> {
  const query = encodeURIComponent(`'${escapeDriveQuery(parentId)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1000`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ${res.status} ao listar pastas do cliente`);
  }
  const data = await res.json();
  return data.files || [];
}

async function createDriveFolder(name: string, parentId: string, accessToken: string, description?: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
      description,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ${res.status} ao criar pasta ${name}`);
  }
  const created = await res.json();
  return created.id;
}

/**
 * Cria/reutiliza a pasta principal do cliente dentro da PASTA_CLIENTES da planilha
 * e garante a estrutura padrão usada por OS, garantia, fotos, orçamento e documentos.
 */
export async function ensureClientDriveStructure(
  accessToken: string,
  rootFolderId: string,
  clientName: string,
  reference?: string
): Promise<ClientDriveStructure> {
  const cleanClientName = safeDriveFolderName(clientName) || 'Cliente';
  const cleanReference = safeDriveFolderName(reference || 'CLIENTE');
  const targetName = `${cleanReference} - ${cleanClientName}`;
  const normalizedClient = normalizeDriveName(cleanClientName);
  const normalizedTarget = normalizeDriveName(targetName);

  const rootChildren = await listChildFolders(rootFolderId, accessToken);
  let clientFolder = rootChildren.find(f => normalizeDriveName(f.name) === normalizedTarget);
  if (!clientFolder) {
    // Reaproveita uma pasta anterior do mesmo cliente, mesmo que o prefixo MA/OS seja diferente.
    clientFolder = rootChildren.find(f => {
      const n = normalizeDriveName(f.name);
      return n === normalizedClient || n.endsWith(` - ${normalizedClient}`);
    });
  }

  let folderId = clientFolder?.id;
  let folderName = clientFolder?.name || targetName;
  if (!folderId) {
    folderId = await createDriveFolder(
      targetName,
      rootFolderId,
      accessToken,
      `Pasta do cliente ${clientName} - Maicon Automação`
    );
    folderName = targetName;
  }

  const existingSubs = await listChildFolders(folderId, accessToken);
  const subfolders: Record<string, string> = {};
  for (const subName of CLIENT_SUBFOLDERS) {
    const existing = existingSubs.find(f => normalizeDriveName(f.name) === normalizeDriveName(subName));
    subfolders[subName] = existing?.id || await createDriveFolder(subName, folderId, accessToken);
  }

  return {
    folderId,
    folderName,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
    subfolders,
  };
}
