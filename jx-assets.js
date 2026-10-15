"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JxShareAssetStore = exports.AssetDataError = void 0;
exports.normalizeAssetPath = normalizeAssetPath;
exports.fileNameToId = fileNameToId;
exports.spriteFramePng = spriteFramePng;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_zlib_1 = require("node:zlib");
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const PACK_HEADER_SIZE = 32;
const PACK_INDEX_ENTRY_SIZE = 16;
const SPR_HEADER_SIZE = 32;
const SPR_FRAME_HEADER_SIZE = 8;
const MAX_ASSET_SIZE = 256 * 1024 * 1024;
const RESOURCE_EXTENSION = /\.(?:spr|bmp|png|jpe?g|webp|wav|mp3|ogg)$/i;
class AssetDataError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AssetDataError';
    }
}
exports.AssetDataError = AssetDataError;
function readExact(fd, length, position) {
    const buffer = Buffer.allocUnsafe(length);
    let totalRead = 0;
    while (totalRead < length) {
        const read = (0, node_fs_1.readSync)(fd, buffer, totalRead, length - totalRead, position + totalRead);
        if (read === 0) {
            throw new AssetDataError('Unexpected end of PAK file', 500);
        }
        totalRead += read;
    }
    return buffer;
}
function normalizeAssetPath(value) {
    const path = value.trim().replace(/\//g, '\\');
    if (!path || path.length > 1024 || /[\u0000-\u001f]/.test(path)) {
        throw new AssetDataError('Invalid asset path');
    }
    const absolute = path.startsWith('\\');
    const parts = [];
    for (const part of path.split('\\')) {
        if (!part || part === '.')
            continue;
        if (part === '..') {
            if (parts.length > 0 && parts[parts.length - 1] !== '..') {
                parts.pop();
            }
            else if (!absolute) {
                parts.push(part);
            }
            continue;
        }
        parts.push(part);
    }
    return `\\${parts.join('\\')}`.toLowerCase();
}
function fileNameToId(assetPath) {
    const normalized = normalizeAssetPath(assetPath);
    let id = 0;
    for (let index = 0; index < normalized.length; index += 1) {
        let charCode = normalized.charCodeAt(index);
        if (charCode > 0x7f)
            charCode -= 0x100;
        const sum = (id + (index + 1) * charCode) >>> 0;
        id = Math.imul(sum % 0x8000000b, 0xffffffef) >>> 0;
    }
    return (id ^ 0x12345678) >>> 0;
}
function decompressNrv2b(source, expectedSize) {
    if (expectedSize < 0 || expectedSize > MAX_ASSET_SIZE) {
        throw new AssetDataError(`PAK entry has an unsupported uncompressed size: ${expectedSize}`, 422);
    }
    const output = Buffer.allocUnsafe(expectedSize);
    let inputOffset = 0;
    let outputOffset = 0;
    let bitBuffer = 0;
    let lastOffset = 1;
    const readBit = () => {
        if (bitBuffer & 0x7f) {
            bitBuffer *= 2;
        }
        else {
            if (inputOffset >= source.length) {
                throw new AssetDataError('NRV2b stream ended before its end marker', 422);
            }
            bitBuffer = source[inputOffset++] * 2 + 1;
        }
        return (bitBuffer >>> 8) & 1;
    };
    for (let iterations = 0; iterations <= expectedSize; iterations += 1) {
        while (readBit()) {
            if (inputOffset >= source.length || outputOffset >= expectedSize) {
                throw new AssetDataError('NRV2b literal exceeds the declared asset size', 422);
            }
            output[outputOffset++] = source[inputOffset++];
        }
        let matchOffset = 1;
        do {
            matchOffset = matchOffset * 2 + readBit();
            if (matchOffset > 0xffffff + 3) {
                throw new AssetDataError('NRV2b match offset is invalid', 422);
            }
        } while (!readBit());
        if (matchOffset === 2) {
            matchOffset = lastOffset;
        }
        else {
            if (inputOffset >= source.length) {
                throw new AssetDataError('NRV2b match offset is truncated', 422);
            }
            matchOffset = (matchOffset - 3) * 256 + source[inputOffset++];
            if (matchOffset === 0xffffffff) {
                if (outputOffset !== expectedSize || inputOffset !== source.length) {
                    throw new AssetDataError('NRV2b output length does not match its PAK index', 422);
                }
                return output;
            }
            lastOffset = ++matchOffset;
        }
        let matchLength = readBit();
        matchLength = matchLength * 2 + readBit();
        if (matchLength === 0) {
            matchLength = 1;
            do {
                matchLength = matchLength * 2 + readBit();
                if (matchLength >= expectedSize) {
                    throw new AssetDataError('NRV2b match length is invalid', 422);
                }
            } while (!readBit());
            matchLength += 2;
        }
        matchLength += matchOffset > 0xd00 ? 1 : 0;
        const copyLength = matchLength + 1;
        if (matchOffset > outputOffset || outputOffset + copyLength > expectedSize) {
            throw new AssetDataError('NRV2b match exceeds the declared asset bounds', 422);
        }
        for (let index = 0; index < copyLength; index += 1) {
            output[outputOffset] = output[outputOffset - matchOffset];
            outputOffset += 1;
        }
    }
    throw new AssetDataError('NRV2b stream exceeds its expected output size', 422);
}
function unpackEntry(pack, entry, frameCompression = false) {
    const method = entry.flags >>> 24;
    const storedSize = entry.flags & 0x00ffffff;
    if (entry.offset < PACK_HEADER_SIZE || storedSize === 0 || entry.offset + storedSize > pack.fileSize) {
        throw new AssetDataError(`PAK entry bounds are invalid in ${pack.name}`, 422);
    }
    const stored = readExact(pack.fd, storedSize, entry.offset);
    if (method === 0) {
        if (entry.size !== stored.length) {
            throw new AssetDataError(`Uncompressed PAK entry size mismatch in ${pack.name}`, 422);
        }
        return stored;
    }
    const codec = frameCompression ? method & 0x0f : method;
    if ([0x01, 0x02, 0x10, 0x20].includes(codec)) {
        return decompressNrv2b(stored, entry.size);
    }
    throw new AssetDataError(`Unsupported PAK compression method 0x${codec.toString(16)} in ${pack.name}`, 422);
}
function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const chunk = Buffer.allocUnsafe(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    typeBuffer.copy(chunk, 4);
    data.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
    return chunk;
}
function encodePng(width, height, rgba) {
    if (width <= 0 || height <= 0 || width * height * 4 !== rgba.length) {
        throw new AssetDataError('Decoded sprite frame dimensions are invalid', 422);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 6;
    const scanlines = Buffer.allocUnsafe(height * (width * 4 + 1));
    for (let y = 0; y < height; y += 1) {
        const rowOffset = y * (width * 4 + 1);
        scanlines[rowOffset] = 0;
        rgba.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
    }
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        pngChunk('IHDR', header),
        pngChunk('IDAT', (0, node_zlib_1.deflateSync)(scanlines)),
        pngChunk('IEND', Buffer.alloc(0))
    ]);
}
function decodeSpriteFrame(frame, palette, colors) {
    if (frame.length < SPR_FRAME_HEADER_SIZE) {
        throw new AssetDataError('SPR frame header is truncated', 422);
    }
    const width = frame.readUInt16LE(0);
    const height = frame.readUInt16LE(2);
    const offsetX = frame.readUInt16LE(4);
    const offsetY = frame.readUInt16LE(6);
    if (width === 0 || height === 0 || width * height > 16_777_216) {
        throw new AssetDataError('SPR frame dimensions are invalid', 422);
    }
    const rgba = Buffer.alloc(width * height * 4);
    let inputOffset = SPR_FRAME_HEADER_SIZE;
    for (let y = 0; y < height; y += 1) {
        let x = 0;
        while (x < width) {
            if (inputOffset + 2 > frame.length) {
                throw new AssetDataError('SPR run-length data is truncated', 422);
            }
            const runLength = frame[inputOffset++];
            const paletteIndex = frame[inputOffset++];
            if (runLength === 0 || x + runLength > width) {
                throw new AssetDataError('SPR run-length data exceeds its scanline', 422);
            }
            if (paletteIndex !== 0) {
                if (inputOffset + runLength > frame.length) {
                    throw new AssetDataError('SPR pixel run is truncated', 422);
                }
                for (let run = 0; run < runLength; run += 1) {
                    const colorIndex = frame[inputOffset++];
                    if (colorIndex >= colors) {
                        throw new AssetDataError('SPR palette index is invalid', 422);
                    }
                    const paletteOffset = colorIndex * 3;
                    const pixelOffset = (y * width + x + run) * 4;
                    rgba[pixelOffset] = palette[paletteOffset];
                    rgba[pixelOffset + 1] = palette[paletteOffset + 1];
                    rgba[pixelOffset + 2] = palette[paletteOffset + 2];
                    rgba[pixelOffset + 3] = colorIndex === 0 ? 0 : 255;
                }
            }
            x += runLength;
        }
    }
    return { width, height, offsetX, offsetY, png: encodePng(width, height, rgba) };
}
function parseSprite(pack, entry, frameIndex) {
    const frameCompressed = (entry.flags & 0x10000000) !== 0;
    const spriteData = frameCompressed ? null : unpackEntry(pack, entry);
    const header = spriteData || readExact(pack.fd, SPR_HEADER_SIZE, entry.offset);
    if (header.length < SPR_HEADER_SIZE || header.toString('ascii', 0, 3) !== 'SPR') {
        throw new AssetDataError('Selected PAK asset is not a valid SPR image', 415);
    }
    const width = header.readUInt16LE(4);
    const height = header.readUInt16LE(6);
    const centerX = header.readUInt16LE(8);
    const centerY = header.readUInt16LE(10);
    const frameCount = header.readUInt16LE(12);
    const colors = header.readUInt16LE(14);
    const directions = header.readUInt16LE(16);
    const interval = header.readUInt16LE(18);
    if (frameCount === 0 || frameCount > 4096 || colors === 0 || colors > 256) {
        throw new AssetDataError('SPR image metadata is invalid', 422);
    }
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= frameCount) {
        throw new AssetDataError(`SPR frame ${frameIndex} is outside the image`, 404);
    }
    const paletteOffset = SPR_HEADER_SIZE;
    const paletteLength = colors * 3;
    const palette = spriteData
        ? spriteData.subarray(paletteOffset, paletteOffset + paletteLength)
        : readExact(pack.fd, paletteLength, entry.offset + paletteOffset);
    if (palette.length !== paletteLength) {
        throw new AssetDataError('SPR color palette is truncated', 422);
    }
    const frameInfoOffset = paletteOffset + paletteLength;
    let frame;
    if (frameCompressed) {
        const frameInfo = readExact(pack.fd, frameCount * 8, entry.offset + frameInfoOffset);
        let frameOffset = entry.offset + frameInfoOffset + frameCount * 8;
        for (let index = 0; index < frameIndex; index += 1) {
            const compressedSize = frameInfo.readInt32LE(index * 8);
            if (compressedSize <= 0) {
                throw new AssetDataError('SPR compressed frame metadata is invalid', 422);
            }
            frameOffset += compressedSize;
        }
        const compressedSize = frameInfo.readInt32LE(frameIndex * 8);
        const rawSize = frameInfo.readInt32LE(frameIndex * 8 + 4);
        if (compressedSize <= 0 || Math.abs(rawSize) > MAX_ASSET_SIZE) {
            throw new AssetDataError('SPR compressed frame metadata is invalid', 422);
        }
        const frameData = rawSize < 0
            ? readExact(pack.fd, -rawSize, frameOffset)
            : decompressNrv2b(readExact(pack.fd, compressedSize, frameOffset), rawSize);
        frame = decodeSpriteFrame(frameData, palette, colors);
    }
    else {
        const frameInfoLength = frameCount * 8;
        if (frameInfoOffset + frameInfoLength > spriteData.length) {
            throw new AssetDataError('SPR frame offset table is truncated', 422);
        }
        const offset = spriteData.readUInt32LE(frameInfoOffset + frameIndex * 8);
        const length = spriteData.readUInt32LE(frameInfoOffset + frameIndex * 8 + 4);
        const start = frameInfoOffset + frameInfoLength + offset;
        if (length < SPR_FRAME_HEADER_SIZE || start + length > spriteData.length) {
            throw new AssetDataError('SPR frame offset is outside the asset', 422);
        }
        frame = decodeSpriteFrame(spriteData.subarray(start, start + length), palette, colors);
    }
    return {
        sprite: { width, height, centerX, centerY, directions, interval, frameCount },
        frame
    };
}
function parsePackageList(clientRoot) {
    const packageFile = [
        (0, node_path_1.join)(clientRoot, 'package.ini'),
        (0, node_path_1.join)(clientRoot, 'Resources', 'package.ini'),
        (0, node_path_1.join)(clientRoot, 'data', 'data', 'package.ini')
    ].find(node_fs_1.existsSync);
    if (packageFile) {
        const text = (0, node_fs_1.readFileSync)(packageFile, 'latin1');
        let inPackageSection = false;
        const entries = new Map();
        for (const line of text.split(/\r?\n/)) {
            const section = line.trim().match(/^\[([^\]]+)\]$/);
            if (section) {
                inPackageSection = section[1].toLowerCase() === 'package';
                continue;
            }
            if (!inPackageSection)
                continue;
            const match = line.trim().match(/^(\d+)\s*=\s*([^;#]+?)\s*$/);
            if (match)
                entries.set(Number(match[1]), (0, node_path_1.basename)(match[2].replace(/\\/g, '/')));
        }
        return {
            names: [...entries.entries()].sort((left, right) => left[0] - right[0]).map(([, name]) => name),
            allowMissing: false
        };
    }
    const mobilePackageFile = [
        (0, node_path_1.join)(clientRoot, 'data', 'paklist_vn.ini'),
        (0, node_path_1.join)(clientRoot, 'data', 'paklist.ini')
    ].find(node_fs_1.existsSync);
    if (!mobilePackageFile) {
        throw new AssetDataError(`Cannot find package.ini or mobile paklist.ini in ${clientRoot}`, 503);
    }
    const text = (0, node_fs_1.readFileSync)(mobilePackageFile, 'latin1');
    let inListSection = false;
    const entries = new Map();
    for (const line of text.split(/\r?\n/)) {
        const section = line.trim().match(/^\[([^\]]+)\]$/);
        if (section) {
            inListSection = section[1].toLowerCase() === 'list';
            continue;
        }
        if (!inListSection)
            continue;
        const match = line.trim().match(/^pak_(\d+)\s*=\s*([^;#]+?)\s*$/i);
        if (!match || !/\.pak$/i.test(match[2]))
            continue;
        const relativePath = match[2].replace(/\\/g, '/');
        if (!/^data\/[^/]+\.pak$/i.test(relativePath)) {
            throw new AssetDataError(`Invalid mobile PAK path in ${(0, node_path_1.basename)(mobilePackageFile)}`, 422);
        }
        entries.set(Number(match[1]), (0, node_path_1.basename)(relativePath));
    }
    if (entries.size === 0) {
        throw new AssetDataError(`No PAK entries found in ${(0, node_path_1.basename)(mobilePackageFile)}`, 422);
    }
    return {
        names: [...entries.entries()].sort((left, right) => left[0] - right[0]).map(([, name]) => name),
        allowMissing: true
    };
}
function readPackIndex(packPath, name) {
    const fileSize = (0, node_fs_1.statSync)(packPath).size;
    if (fileSize < PACK_HEADER_SIZE) {
        throw new AssetDataError(`PAK file is too small: ${name}`, 422);
    }
    const fd = (0, node_fs_1.openSync)(packPath, 'r');
    try {
        const header = readExact(fd, PACK_HEADER_SIZE, 0);
        if (header.toString('ascii', 0, 4) !== 'PACK') {
            throw new AssetDataError(`Invalid PAK signature: ${name}`, 422);
        }
        const count = header.readUInt32LE(4);
        const indexOffset = header.readUInt32LE(8);
        if (count === 0 || count > 10_000_000 || indexOffset < PACK_HEADER_SIZE ||
            indexOffset + count * PACK_INDEX_ENTRY_SIZE > fileSize) {
            throw new AssetDataError(`Invalid PAK index bounds: ${name}`, 422);
        }
        const index = readExact(fd, count * PACK_INDEX_ENTRY_SIZE, indexOffset);
        return { name, path: packPath, fd, fileSize, index, count };
    }
    catch (error) {
        (0, node_fs_1.closeSync)(fd);
        throw error;
    }
}
function findEntry(pack, id) {
    let low = 0;
    let high = pack.count - 1;
    while (low <= high) {
        const middle = (low + high) >>> 1;
        const offset = middle * PACK_INDEX_ENTRY_SIZE;
        const currentId = pack.index.readUInt32LE(offset);
        if (currentId === id) {
            return {
                id: currentId,
                offset: pack.index.readUInt32LE(offset + 4),
                size: pack.index.readInt32LE(offset + 8),
                flags: pack.index.readUInt32LE(offset + 12)
            };
        }
        if (currentId < id)
            low = middle + 1;
        else
            high = middle - 1;
    }
    return undefined;
}
function hashPackPathBytes(bytes) {
    let id = 0;
    for (let index = 0; index < bytes.length; index += 1) {
        let charCode = bytes[index];
        if (charCode >= 0x41 && charCode <= 0x5a)
            charCode += 0x20;
        if (charCode > 0x7f)
            charCode -= 0x100;
        const sum = (id + (index + 1) * charCode) >>> 0;
        id = Math.imul(sum % 0x8000000b, 0xffffffef) >>> 0;
    }
    return (id ^ 0x12345678) >>> 0;
}
function fileNameToIds(assetPath) {
    const normalized = normalizeAssetPath(assetPath);
    const ids = [
        fileNameToId(normalized),
        hashPackPathBytes(iconv_lite_1.default.encode(normalized, 'gbk')),
        hashPackPathBytes(Buffer.from(normalized, 'utf8'))
    ];
    return [...new Set(ids)];
}
function collectResourceReferences(clientRoot) {
    const roots = ['settings', 'script', 'Ui', 'lang', 'Classes', 'Resources']
        .map((name) => (0, node_path_1.join)(clientRoot, name))
        .filter(node_fs_1.existsSync);
    const references = new Set();
    const pattern = /[^\s"'=,;|<>]*\.(?:spr|bmp|png|jpe?g|webp|wav|mp3|ogg)\b/gi;
    const textFilePattern = /\.(?:ini|txt|lua|tab|cfg|cpp|h|c|xml|json)$/i;
    const scanDirectory = (directory) => {
        for (const entry of (0, node_fs_1.readdirSync)(directory, { withFileTypes: true })) {
            const filePath = (0, node_path_1.join)(directory, entry.name);
            if (entry.isDirectory()) {
                scanDirectory(filePath);
            }
            else if (entry.isFile() && textFilePattern.test(entry.name)) {
                const fileSize = (0, node_fs_1.statSync)(filePath).size;
                if (fileSize > 16 * 1024 * 1024)
                    continue;
                const contents = (0, node_fs_1.readFileSync)(filePath).toString('latin1');
                for (const match of contents.matchAll(pattern)) {
                    const value = match[0].replace(/[)\]}]+$/, '');
                    if (value)
                        references.add(normalizeAssetPath(value));
                }
            }
        }
    };
    for (const root of roots)
        scanDirectory(root);
    return [...references];
}
class JxShareAssetStore {
    clientRoot;
    packs;
    missingPacks;
    lookupCache = new Map();
    resourceCatalog;
    constructor(clientRoot, pakDirectoryOverride) {
        this.clientRoot = clientRoot;
        const root = (0, node_path_1.resolve)(clientRoot);
        const packDirectory = (0, node_path_1.resolve)(pakDirectoryOverride || (0, node_path_1.join)(root, 'data'));
        if (!(0, node_fs_1.existsSync)(packDirectory) || !(0, node_fs_1.statSync)(packDirectory).isDirectory()) {
            throw new AssetDataError(`Cannot find the selected share data folder: ${packDirectory}`, 503);
        }
        const { names, allowMissing } = parsePackageList(root);
        if (names.length === 0) {
            throw new AssetDataError(`package.ini has no PAK entries: ${(0, node_path_1.join)(root, 'package.ini')}`, 503);
        }
        const packs = [];
        const missingPacks = [];
        for (const name of names) {
            const packPath = (0, node_path_1.resolve)(packDirectory, name);
            if (!packPath.startsWith(`${packDirectory}${node_path_1.sep}`)) {
                throw new AssetDataError(`Configured PAK path is invalid: ${name}`, 422);
            }
            if (!(0, node_fs_1.existsSync)(packPath)) {
                if (allowMissing) {
                    missingPacks.push(name);
                    continue;
                }
                throw new AssetDataError(`Configured PAK file is missing: ${name}`, 503);
            }
            packs.push(readPackIndex(packPath, name));
        }
        if (packs.length === 0) {
            throw new AssetDataError(`No configured PAK files are available in ${packDirectory}`, 503);
        }
        this.packs = packs;
        this.missingPacks = missingPacks;
    }
    get info() {
        return {
            enabled: true,
            clientRoot: this.clientRoot,
            packCount: this.packs.length,
            packs: this.packs.map(({ name }) => name),
            missingPacks: this.missingPacks
        };
    }
    listResources(query, extension, limit) {
        if (!this.resourceCatalog) {
            this.resourceCatalog = collectResourceReferences(this.clientRoot)
                .map((path) => {
                const result = this.lookup(path);
                return result ? { path, id: result.entry.id, pack: result.pack.name } : undefined;
            })
                .filter((asset) => asset !== undefined);
        }
        const normalizedQuery = query.toLowerCase();
        const normalizedExtension = extension.toLowerCase().replace(/^\./, '');
        const filtered = this.resourceCatalog.filter((asset) => asset.path.toLowerCase().includes(normalizedQuery) &&
            (!normalizedExtension || asset.path.toLowerCase().endsWith(`.${normalizedExtension}`)));
        return { total: filtered.length, items: filtered.slice(0, limit) };
    }
    getSprite(path, frameIndex) {
        const normalized = normalizeAssetPath(path);
        const result = this.lookup(normalized);
        if (!result) {
            throw new AssetDataError(`Asset path was not found in the selected share PAKs: ${normalized}`, 404);
        }
        return parseSprite(result.pack, result.entry, frameIndex);
    }
    getAssetData(path) {
        const normalized = normalizeAssetPath(path);
        const result = this.lookup(normalized);
        if (!result) {
            throw new AssetDataError(`Asset path was not found in the selected share PAKs: ${normalized}`, 404);
        }
        return unpackEntry(result.pack, result.entry);
    }
    close() {
        for (const pack of this.packs)
            (0, node_fs_1.closeSync)(pack.fd);
    }
    lookup(path) {
        for (const id of fileNameToIds(path)) {
            if (this.lookupCache.has(id)) {
                const cached = this.lookupCache.get(id);
                if (cached)
                    return cached;
                continue;
            }
            for (const pack of this.packs) {
                const entry = findEntry(pack, id);
                if (entry) {
                    if (entry.size < 0 || entry.size > MAX_ASSET_SIZE) {
                        throw new AssetDataError(`Asset size is unsupported: ${path}`, 422);
                    }
                    const result = { pack, entry };
                    this.lookupCache.set(id, result);
                    return result;
                }
            }
            this.lookupCache.set(id, null);
        }
        return undefined;
    }
}
exports.JxShareAssetStore = JxShareAssetStore;
function spriteFramePng(store, path, frameIndex) {
    const result = store.getSprite(path, frameIndex);
    return {
        png: result.frame.png,
        width: result.sprite.width,
        height: result.sprite.height,
        centerX: result.sprite.centerX,
        centerY: result.sprite.centerY,
        directions: result.sprite.directions,
        interval: result.sprite.interval,
        frameCount: result.sprite.frameCount,
        frameWidth: result.frame.width,
        frameHeight: result.frame.height,
        offsetX: result.frame.offsetX,
        offsetY: result.frame.offsetY
    };
}
