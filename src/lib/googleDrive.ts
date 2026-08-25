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
  accessToken: string
): Promise<{ fileId: string; name: string }> {
  const dateFormatted = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `${DRIVE_BACKUP_PREFIX}${dateFormatted}.json`;
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
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&pageSize=10&fields=files(id,name,modifiedTime,size,webViewLink)`;

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
