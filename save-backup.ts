import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SAVE_KEYS = [
  'jxidle',
  'jxidle_bak',
  'jxidle_2',
  'jxidle_2_bak',
  'jxidle_3',
  'jxidle_3_bak',
  'jxidle_slot',
  'jxidle_stash',
  'jxidle_stash_bak',
  'jxidle_kps',
  'jxidle_2_kps',
  'jxidle_3_kps'
] as const;
const MAX_VALUE_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

export class SaveBackupError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'SaveBackupError';
  }
}

export type SaveBackup = {
  version: 1;
  updatedAt: string;
  storage: Record<string, string>;
};

function validateStorage(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SaveBackupError('Backup storage must be an object.', 400);
  }

  const incoming = value as Record<string, unknown>;
  const storage: Record<string, string> = {};
  let totalBytes = 0;

  for (const [key, item] of Object.entries(incoming)) {
    if (!(SAVE_KEYS as readonly string[]).includes(key) || typeof item !== 'string') {
      throw new SaveBackupError('Backup contains an unsupported save field.', 400);
    }
    const bytes = Buffer.byteLength(item, 'utf8');
    if (bytes > MAX_VALUE_BYTES) {
      throw new SaveBackupError(`Backup field is too large: ${key}.`, 413);
    }
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new SaveBackupError('Backup is too large.', 413);
    }
    storage[key] = item;
  }

  return storage;
}

export async function readSaveBackup(directory: string): Promise<SaveBackup | null> {
  const filePath = join(directory, 'save-backup.json');
  let contents: string;
  try {
    contents = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }

  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new SaveBackupError('The server save backup file is invalid JSON.', 500);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SaveBackupError('The server save backup file has an invalid format.', 500);
  }

  const backup = value as Record<string, unknown>;
  if (backup.version !== 1 || typeof backup.updatedAt !== 'string') {
    throw new SaveBackupError('The server save backup version is unsupported.', 500);
  }
  try {
    return { version: 1, updatedAt: backup.updatedAt, storage: validateStorage(backup.storage) };
  } catch (error) {
    if (error instanceof SaveBackupError) {
      throw new SaveBackupError('The server save backup contains invalid data.', 500);
    }
    throw error;
  }
}

export async function writeSaveBackup(directory: string, value: unknown): Promise<SaveBackup> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SaveBackupError('A backup payload is required.', 400);
  }
  const payload = value as Record<string, unknown>;
  const backup: SaveBackup = {
    version: 1,
    updatedAt: new Date().toISOString(),
    storage: validateStorage(payload.storage)
  };

  await mkdir(directory, { recursive: true });
  const filePath = join(directory, 'save-backup.json');
  const tempPath = join(directory, `save-backup-${process.pid}-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, JSON.stringify(backup), { encoding: 'utf8', flag: 'wx' });
    await rename(tempPath, filePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
  return backup;
}
