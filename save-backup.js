"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveBackupError = void 0;
exports.readSaveBackup = readSaveBackup;
exports.writeSaveBackup = writeSaveBackup;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
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
];
const MAX_VALUE_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
class SaveBackupError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'SaveBackupError';
    }
}
exports.SaveBackupError = SaveBackupError;
function validateStorage(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new SaveBackupError('Backup storage must be an object.', 400);
    }
    const incoming = value;
    const storage = {};
    let totalBytes = 0;
    for (const [key, item] of Object.entries(incoming)) {
        if (!SAVE_KEYS.includes(key) || typeof item !== 'string') {
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
async function readSaveBackup(directory) {
    const filePath = (0, node_path_1.join)(directory, 'save-backup.json');
    let contents;
    try {
        contents = await (0, promises_1.readFile)(filePath, 'utf8');
    }
    catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
            return null;
        throw error;
    }
    let value;
    try {
        value = JSON.parse(contents);
    }
    catch {
        throw new SaveBackupError('The server save backup file is invalid JSON.', 500);
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new SaveBackupError('The server save backup file has an invalid format.', 500);
    }
    const backup = value;
    if (backup.version !== 1 || typeof backup.updatedAt !== 'string') {
        throw new SaveBackupError('The server save backup version is unsupported.', 500);
    }
    try {
        return { version: 1, updatedAt: backup.updatedAt, storage: validateStorage(backup.storage) };
    }
    catch (error) {
        if (error instanceof SaveBackupError) {
            throw new SaveBackupError('The server save backup contains invalid data.', 500);
        }
        throw error;
    }
}
async function writeSaveBackup(directory, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new SaveBackupError('A backup payload is required.', 400);
    }
    const payload = value;
    const backup = {
        version: 1,
        updatedAt: new Date().toISOString(),
        storage: validateStorage(payload.storage)
    };
    await (0, promises_1.mkdir)(directory, { recursive: true });
    const filePath = (0, node_path_1.join)(directory, 'save-backup.json');
    const tempPath = (0, node_path_1.join)(directory, `save-backup-${process.pid}-${(0, node_crypto_1.randomUUID)()}.tmp`);
    try {
        await (0, promises_1.writeFile)(tempPath, JSON.stringify(backup), { encoding: 'utf8', flag: 'wx' });
        await (0, promises_1.rename)(tempPath, filePath);
    }
    catch (error) {
        await (0, promises_1.unlink)(tempPath).catch(() => undefined);
        throw error;
    }
    return backup;
}
