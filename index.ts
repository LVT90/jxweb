import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createConnection } from 'node:net';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join, resolve, extname, relative, isAbsolute, sep } from 'node:path';
import { runInNewContext } from 'node:vm';
import { RawData, WebSocketServer } from 'ws';
import { AssetDataError, JxShareAssetStore, spriteFramePng } from './jx-assets.js';
import { cityNpcPoints } from './jx-city-map.js';
import {
  bianjingMapDefinition,
  bianjingRegion,
  getMapDefinition,
  getMapEntities,
  getMapList,
  getMapRegion
} from './jx-map.js';
import { npcResourceDetails } from './jx-npc.js';
import { readSaveBackup, SaveBackupError, writeSaveBackup } from './save-backup.js';

type PlayerState = {
  id: string;
  x: number;
  y: number;
  name: string;
  color: string;
  zoneId?: number;
  fac?: string;
  lvl?: number;
  act?: string;
  dir?: number;
};
type SourceProfile = {
  name: string;
  category: 'map' | 'skill' | 'npc' | 'system';
  file: string;
  summary: string;
};

type EntityCatalogItem = {
  id: string;
  name: string;
  kind: 'player' | 'npc' | 'monster';
  label: string;
  palette: string[];
  role: string;
  shape: 'human' | 'beast' | 'boss';
};

type LegacyAnimationFrame = {
  f: string;
  n: number;
  d: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  ms: number;
};

type LegacyWorldData = {
  mon: Record<string, { n: string; anim: string }>;
  hero: Record<string, { img: string; anim: string }>;
  anim: Record<string, Record<string, LegacyAnimationFrame>>;
  zones: Array<{ id: number; n: string; lo: number; hi: number; bg: string; m: number[]; boss: number }>;
};

type Manifest = {
  generatedAt: string;
  roots: string[];
  maps: string[];
  skills: string[];
  npcs: string[];
  assetPacks: string[];
  sourceHighlights: SourceProfile[];
  entityCatalog: EntityCatalogItem[];
  legacyArt: {
    monsters: Array<{ id: number; name: string; animationKey: string }>;
    heroes: Array<{ id: string; image: string; animationKey: string }>;
    animations: LegacyWorldData['anim'];
    zones: Array<{ id: number; name: string; level: number; background: string; monsterIds: number[]; bossId: number }>;
  };
  world: {
    regions: Array<{ id: string; name: string; level: number; danger: number; description: string; x: number; y: number; sourceZoneId?: number }>;
    boss: { name: string; level: number; intro: string; };
    log: string[];
  };
};

const projectRoot = resolve(__dirname, '..', '..');
const clientDir = resolve(projectRoot, 'client');
const port = Number(process.env.PORT || 2567);
const host = process.env.HOST?.trim() || '0.0.0.0';
const nativeGatewayPort = Number(process.env.JX_NATIVE_GATEWAY_PORT || 5622);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}
if (!Number.isInteger(nativeGatewayPort) || nativeGatewayPort < 1 || nativeGatewayPort > 65535) {
  throw new Error('JX_NATIVE_GATEWAY_PORT must be a valid TCP port.');
}
const players = new Map<any, PlayerState>();
const playerChatTimes = new WeakMap<object, number>();
const shareClientDir = process.env.JX_CLIENT_DIR?.trim();
const sharePakDir = process.env.JX_PAK_DIR?.trim();
const npcSettingsDir = process.env.JX_NPC_SETTINGS_DIR?.trim();
const pcCityMapsDir = process.env.JX_PC_CITY_MAPS_DIR?.trim();
const mobileCityMapsDir = process.env.JX_MOBILE_CITY_MAPS_DIR?.trim();
// Native per-map monster spawn anchors: Settings\maps\{village_out,city_out}\<mapId>.txt
// Defaults to the sibling "maps" folder of the NPC settings dir in this source tree.
const spawnMapsDir = process.env.JX_SPAWN_MAPS_DIR?.trim()
  || (npcSettingsDir ? resolve(npcSettingsDir, '..', 'maps') : undefined);
const saveBackupDir = resolve(process.env.JX_SAVE_BACKUP_DIR?.trim() || join(projectRoot, 'server', 'data'));
const shareAssets = shareClientDir ? new JxShareAssetStore(shareClientDir, sharePakDir) : undefined;
let seq = 1;

function walkDirectory(root: string, maxDepth = 4, currentDepth = 0): string[] {
  if (!existsSync(root) || currentDepth > maxDepth) return [];

  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const target = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDirectory(target, maxDepth, currentDepth + 1));
    } else {
      files.push(target.replace(/\\/g, '/'));
    }
  }
  return files;
}

function safeNameFromPath(file: string): string {
  const name = file.split('/').pop() || file;
  return name.replace(/\.[^.]+$/, '');
}

function readSourceProfile(files: string[], pattern: RegExp, category: SourceProfile['category']): SourceProfile[] {
  const items: SourceProfile[] = [];
  for (const file of files) {
    if (!pattern.test(file)) continue;
    const path = resolve(projectRoot, file.replace(/^\.?\//, ''));
    if (!existsSync(path)) continue;

    try {
      const content = readFileSync(path, 'utf8');
      const classMatches = [...content.matchAll(/class\s+([A-Z][A-Za-z0-9_]+)/g)].map(m => m[1]);
      const names = [...new Set(classMatches)].slice(0, 6);
      const summary = names.length ? `Source class: ${names.join(', ')}` : `Imported file: ${safeNameFromPath(file)}`;
      items.push({
        name: safeNameFromPath(file),
        category,
        file,
        summary
      });
    } catch {
      items.push({
        name: safeNameFromPath(file),
        category,
        file,
        summary: 'Imported source asset'
      });
    }
  }
  return items.slice(0, 20);
}

function buildManifest(): Manifest {
  return {
    generatedAt: new Date().toISOString(),
    roots: [clientDir.replace(/\\/g, '/')],
    maps: ['Biện Kinh (37)', 'Tương Dương (78)', 'Phượng Tường (1)'],
    skills: ['Đạt Ma Kiếm Pháp', 'Hàng Long Chưởng', 'Thái Cực Kiếm Pháp', 'Truy Tâm Tiễn', 'Phong Sương Toái Ảnh'],
    npcs: ['Dã Tẩu', 'Xa phu', 'Thợ rèn', 'Tiệm tạp hóa', 'Hiệu thuốc', 'Võ lâm truyền nhân'],
    assetPacks: ['dxrm.pak', 'maps.pak', 'resource.pak', 'skills.pak', 'sound.pak', 'spr.pak', 'ui.pak'],
    sourceHighlights: [],
    entityCatalog: [
      { id: 'player-hero', name: 'PlayerHero', kind: 'player', label: 'Người chơi', palette: ['#8de7ff', '#74d0ff', '#2c5c9d'], role: 'Hero', shape: 'human' },
      { id: 'npc-datau', name: 'DaTau', kind: 'npc', label: 'Dã Tẩu', palette: ['#d7c7a3', '#f6dcb9', '#8f6d4c'], role: 'Nhiệm vụ', shape: 'human' }
    ],
    legacyArt: {
      monsters: [],
      heroes: [],
      animations: {},
      zones: []
    },
    world: {
      regions: [
        { id: 'city-37', name: 'Biện Kinh', level: 1, danger: 0, description: 'Hoàng thành Biện Kinh', x: 1792, y: 1792 }
      ],
      boss: { name: 'Thủ lĩnh Sơn Tặc', level: 20, intro: 'Boss dã ngoại xuất hiện tại cổng thành' },
      log: ['Webgame JX Kiếm Hiệp đa nền tảng thế hệ mới', 'Khởi tạo từ con số 0']
    }
  };
}

const manifest = buildManifest();

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

const FACTIONS = [
  { id: 'shaolin', name: 'Thiếu Lâm', element: 'Kim', series: 0, desc: 'Cận chiến · Ngoại công · Phòng thủ kim thân', color: '#f39c12', skills: ['Đạt Ma Kiếm Pháp', 'La Hán Trận', 'Sư Tử Hống', 'Dịch Cân Kinh'] },
  { id: 'tianwang', name: 'Thiên Vương', element: 'Kim', series: 0, desc: 'Cận chiến · Đoạt mệnh thương · Sinh lực dũng mãnh', color: '#e67e22', skills: ['Thiên Vương Đao Pháp', 'Đoạt Mệnh Thương', 'Chiến Ý Khắc Địch', 'Thiên Vương Chiến Khí'] },
  { id: 'tangmen', name: 'Đường Môn', element: 'Mộc', series: 1, desc: 'Tầm xa · Cạm bẫy · Ám khí bạo kích', color: '#27ae60', skills: ['Truy Tâm Tiễn', 'Địa Lôi Quyết', 'Cửu Cung Phi Tinh', 'Mạn Thiên Hoa Vũ'] },
  { id: 'wudu', name: 'Ngũ Độc', element: 'Mộc', series: 1, desc: 'Tầm xa · Độc chưởng · Vô hình cổ rút máu', color: '#2ecc71', skills: ['Âm Phong Thực Cốt', 'U Hồn Phệ Cốt', 'Bách Độc Xuyên Tâm', 'Vô Hình Cổ'] },
  { id: 'emei', name: 'Nga My', element: 'Thủy', series: 2, desc: 'Tầm xa · Băng sát làm chậm · Từ hàng phổ độ', color: '#3498db', skills: ['Phong Sương Toái Ảnh', 'Từ Hàng Phổ Độ', 'Bất Diệt Tâm Pháp', 'Phật Quang Phổ Chiếu'] },
  { id: 'cuiyan', name: 'Thúy Yên', element: 'Thủy', series: 2, desc: 'Cận chiến · Tàng hình · Băng phách hàn quang', color: '#1abc9c', skills: ['Băng Tâm Tiên Tử', 'Vũ Đả Lê Hoa', 'Băng Phách Hàn Quang', 'Thúy Yên Đao Pháp'] },
  { id: 'gaibang', name: 'Cái Bang', element: 'Hỏa', series: 3, desc: 'Cận chiến · Hàng long thập bát chưởng rồng lửa', color: '#e74c3c', skills: ['Hàng Long Chưởng', 'Đả Cẩu Bổng Pháp', 'Kháng Long Hữu Hối', 'Túy Điệp Cuồng Vũ'] },
  { id: 'tianren', name: 'Thiên Nhẫn', element: 'Hỏa', series: 3, desc: 'Tầm xa · Ma diệm thao thiên · Thiêu đốt diện rộng', color: '#c0392b', skills: ['Thôi Sơn Điền Hải', 'Ma Diệm Thao Thiên', 'Thiên Ma Giải Thể', 'Phi Hồng Vô Tích'] },
  { id: 'wudang', name: 'Võ Đang', element: 'Thổ', series: 4, desc: 'Tầm xa · Thái cực kiếm khí · Choáng định thân', color: '#9b59b6', skills: ['Thái Cực Kiếm Pháp', 'Bát Quái Du Long', 'Tọa Vọng Vô Vi', 'Nhân Kiếm Hợp Nhất'] },
  { id: 'kunlun', name: 'Côn Lôn', element: 'Thổ', series: 4, desc: 'Tầm xa · Cuồng phong sậu vũ · Lôi động cửu thiên', color: '#8e44ad', skills: ['Cuồng Phong Sậu Vũ', 'Lôi Động Cửu Thiên', 'Sương Ngao Côn Lôn', 'Ngũ Lôi Chánh Pháp'] }
];

const legacyWebExtensions = new Set([
  '.css', '.gif', '.html', '.ico', '.jpeg', '.jpg', '.js', '.mjs', '.json',
  '.mp3', '.ogg', '.wav', '.png', '.svg', '.ttf', '.webmanifest', '.webp', '.woff', '.woff2'
]);

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function localRequestAllowed(req: IncomingMessage, requireOrigin: boolean): boolean {
  const host = req.headers.host;
  if (!host) return false;
  let hostUrl: URL;
  try {
    hostUrl = new URL(`http://${host}`);
  } catch {
    return false;
  }
  if (!['localhost', '127.0.0.1'].includes(hostUrl.hostname) || Number(hostUrl.port || 80) !== port) return false;
  const origin = req.headers.origin;
  if (!origin) return !requireOrigin;
  try {
    return new URL(origin).origin === hostUrl.origin;
  } catch {
    return false;
  }
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (address === '::1') return true;
  const ipv4Address = address?.startsWith('::ffff:') ? address.slice(7) : address;
  return ipv4Address === '127.0.0.1';
}

async function readJsonRequest(req: IncomingMessage): Promise<unknown> {
  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > 2 * 1024 * 1024 + 16 * 1024) {
    throw new SaveBackupError('Backup request is too large.', 413);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 2 * 1024 * 1024 + 16 * 1024) {
      throw new SaveBackupError('Backup request is too large.', 413);
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new SaveBackupError('Backup request must contain valid JSON.', 400);
  }
}

async function handleSaveBackup(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!localRequestAllowed(req, req.method === 'POST')) {
    sendJson(res, 403, { ok: false, error: 'Save backups are available only to this local web app.' });
    return;
  }
  if (req.method === 'GET') {
    try {
      sendJson(res, 200, { ok: true, backup: await readSaveBackup(saveBackupDir) });
    } catch (error) {
      if (error instanceof SaveBackupError) {
        sendJson(res, error.statusCode, { ok: false, error: error.message });
        return;
      }
      console.error('Unable to read the local save backup:', error);
      sendJson(res, 500, { ok: false, error: 'Unable to read the local save backup.' });
    }
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    sendJson(res, 405, { ok: false, error: 'Only GET and POST are supported.' });
    return;
  }
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    sendJson(res, 415, { ok: false, error: 'Backup requests must use application/json.' });
    return;
  }
  try {
    const backup = await writeSaveBackup(saveBackupDir, await readJsonRequest(req));
    sendJson(res, 200, { ok: true, updatedAt: backup.updatedAt });
  } catch (error) {
    if (error instanceof SaveBackupError) {
      sendJson(res, error.statusCode, { ok: false, error: error.message });
      return;
    }
    console.error('Unable to write the local save backup:', error);
    sendJson(res, 500, { ok: false, error: 'Unable to write the local save backup.' });
  }
}

function serveDirectoryFile(
  res: ServerResponse,
  root: string,
  pathname: string,
  allowWebAssetsOnly: boolean
) {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid URL path' });
    return;
  }

  if (decodedPath.includes('\0')) {
    sendJson(res, 400, { ok: false, error: 'Invalid URL path' });
    return;
  }

  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const safePath = resolve(root, `.${requestedPath}`);
  const pathFromRoot = relative(root, safePath);
  if (isAbsolute(pathFromRoot) || pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) {
    sendJson(res, 403, { ok: false, error: 'Forbidden' });
    return;
  }
  if (!existsSync(safePath) || !statSync(safePath).isFile()) {
    sendJson(res, 404, { ok: false, error: 'Not found' });
    return;
  }

  const ext = extname(safePath).toLowerCase();
  if (allowWebAssetsOnly && !legacyWebExtensions.has(ext)) {
    sendJson(res, 404, { ok: false, error: 'Not found' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ['.html', '.js', '.mjs', '.css'].includes(ext) ? 'no-cache' : 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(readFileSync(safePath));
}

function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  serveDirectoryFile(res, clientDir, url.pathname, false);
}

function getMapBackground(mapId: number): { root: string; pathname: string } | undefined {
  const townBackground = `/jx-idle-main/img/z/towns/${mapId}.jpg`;
  const townPath = resolve(projectRoot, `.${townBackground}`);
  if (existsSync(townPath) && statSync(townPath).isFile()) {
    return { root: projectRoot, pathname: townBackground };
  }

  const fieldBackground = `/assets/idle-ui/img/z/${mapId}.jpg`;
  const fieldPath = resolve(clientDir, `.${fieldBackground}`);
  if (existsSync(fieldPath) && statSync(fieldPath).isFile()) {
    return { root: clientDir, pathname: fieldBackground };
  }
  return undefined;
}

const baLangHuyenNativeArtwork = '/assets/maps/ba-lang-huyen/ba-lang-huyen.webp';

function getNativeMapArtwork(mapId: number): string | undefined {
  if (mapId !== 53) return undefined;
  const filePath = resolve(clientDir, `.${baLangHuyenNativeArtwork}`);
  return existsSync(filePath) && statSync(filePath).isFile()
    ? baLangHuyenNativeArtwork
    : undefined;
}

type SpriteAnimationSheet = {
  f: string;
  n: number;
  d: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  ms: number;
  s?: number;
  fixed?: number;
};

let spriteAnimationCatalog: Record<string, Record<string, SpriteAnimationSheet>> | undefined;

function getSpriteAnimationSheet(key: string, action: string): SpriteAnimationSheet | undefined {
  if (!spriteAnimationCatalog) {
    const worldPath = resolve(projectRoot, 'jx-idle-main', 'world.js');
    if (!existsSync(worldPath) || !statSync(worldPath).isFile()) {
      return undefined;
    }

    const worldSource = readFileSync(worldPath, 'utf8').trim();
    const assignment = 'window.JW=';
    if (!worldSource.startsWith(assignment) || !worldSource.endsWith(';')) {
      throw new Error('The shared JX world manifest has an unsupported format.');
    }

    const worldData = JSON.parse(worldSource.slice(assignment.length, -1)) as {
      anim?: Record<string, Record<string, SpriteAnimationSheet>>;
    };
    if (!worldData.anim || typeof worldData.anim !== 'object') {
      throw new Error('The shared JX world manifest does not contain animation metadata.');
    }
    spriteAnimationCatalog = worldData.anim;
  }

  const sheet = spriteAnimationCatalog[key]?.[action];
  if (!sheet) return undefined;
  if (!/^[a-z0-9_]+\.webp$/i.test(sheet.f) ||
      ![sheet.n, sheet.d, sheet.w, sheet.h, sheet.ms].every(Number.isFinite) ||
      sheet.n < 1 || sheet.d < 1 || sheet.w < 1 || sheet.h < 1 || sheet.ms < 1) {
    throw new Error(`Invalid animation metadata for ${key}/${action}.`);
  }
  return sheet;
}

const httpServer = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (url.pathname === '/api/jx/factions') {
    sendJson(res, 200, { ok: true, factions: FACTIONS });
    return;
  }

  const npcArtRoute = /^\/api\/jx\/art\/npc\/(passerby040_3|passerby007|passerby004_1|passerby178|passerby192)\.png$/.exec(url.pathname);
  if (npcArtRoute) {
    serveDirectoryFile(
      res,
      projectRoot,
      `/jx-idle-main/img/npc-native/jxpc/${npcArtRoute[1]}.png`,
      true
    );
    return;
  }

  const animationRoute = /^\/api\/jx\/art\/animation\/([a-z0-9_]+)\/(st|run|at|hurt|die|mag)(\.webp)?$/i.exec(url.pathname);
  if (animationRoute) {
    try {
      const [, rawKey, rawAction, imageRequest] = animationRoute;
      const key = rawKey.toLowerCase();
      const action = rawAction.toLowerCase();
      const sheet = getSpriteAnimationSheet(key, action);
      if (!sheet) {
        sendJson(res, 404, { ok: false, error: 'No animation sheet is available for this sprite.' });
        return;
      }

      if (imageRequest) {
        serveDirectoryFile(res, projectRoot, `/jx-idle-main/img/a/${sheet.f}`, true);
      } else {
        sendJson(res, 200, {
          ok: true,
          sheet,
          imageUrl: `/api/jx/art/animation/${key}/${action}.webp`
        });
      }
    } catch (error) {
      console.error('Unable to resolve a shared sprite animation:', error);
      sendJson(res, 500, { ok: false, error: 'Unable to resolve the shared sprite animation.' });
    }
    return;
  }

  if (url.pathname === '/api/save-backup') {
    void handleSaveBackup(req, res);
    return;
  }

  if (url.pathname === '/api/jx/health') {
    if (!shareAssets) {
      sendJson(res, 503, {
        ok: false,
        error: 'The selected PC/mobile game data is not configured. Set JX_CLIENT_DIR to its client folder.'
      });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      packCount: shareAssets.info.packCount,
      missingPacks: shareAssets.info.missingPacks,
      npcSettingsConfigured: Boolean(npcSettingsDir)
    });
    return;
  }

  if (url.pathname === '/api/jx/city-npc-points') {
    if (!pcCityMapsDir || !mobileCityMapsDir) {
      sendJson(res, 503, { ok: false, error: 'PC and mobile city-map folders must be configured.' });
      return;
    }
    const requestedMapId = url.searchParams.get('mapId') || '';
    if (!/^\d{1,4}$/.test(requestedMapId)) {
      sendJson(res, 400, { ok: false, error: 'A valid city map id is required.' });
      return;
    }
    try {
      sendJson(res, 200, { ok: true, ...cityNpcPoints(pcCityMapsDir, mobileCityMapsDir, Number(requestedMapId)) });
    } catch (error) {
      if (error instanceof AssetDataError) {
        sendJson(res, error.statusCode, { ok: false, error: error.message });
        return;
      }
      console.error('Unable to read native city NPC points:', error);
      sendJson(res, 500, { ok: false, error: 'Unable to read native city NPC points.' });
    }
    return;
  }

  if (url.pathname === '/api/jx/npc-resources') {
    if (!shareAssets || !npcSettingsDir) {
      sendJson(res, 503, { ok: false, error: 'The selected PC/mobile PAK and NPC settings data are not configured.' });
      return;
    }
    try {
      const id = url.searchParams.get('id');
      if (!id) {
        sendJson(res, 400, { ok: false, error: 'An NPC id is required.' });
        return;
      }
      sendJson(res, 200, { ok: true, ...npcResourceDetails(npcSettingsDir, shareAssets, id) });
    } catch (error) {
      if (error instanceof AssetDataError) {
        sendJson(res, error.statusCode, { ok: false, error: error.message });
        return;
      }
      console.error('Unable to resolve selected NPC resources:', error);
      sendJson(res, 500, { ok: false, error: 'Unable to resolve the selected NPC resources.' });
    }
    return;
  }

  if (url.pathname === '/api/jx/maps') {
    sendJson(res, 200, { ok: true, maps: getMapList() });
    return;
  }

  const nativeMapRoute = /^\/api\/jx\/map\/(\d+)(?:\/(region|entities|background))?$/.exec(url.pathname);
  if (nativeMapRoute) {
    if (!shareAssets) {
      sendJson(res, 503, { ok: false, error: 'The selected PC/mobile game data is not configured.' });
      return;
    }
    try {
      const mapId = Number(nativeMapRoute[1]);
      const sub = nativeMapRoute[2];
      if (sub === 'background') {
        const background = getMapBackground(mapId);
        if (!background) {
          sendJson(res, 404, { ok: false, error: 'No artwork is available for this map.' });
          return;
        }
        serveDirectoryFile(res, background.root, background.pathname, true);
      } else if (sub === 'region') {
        const x = Number(url.searchParams.get('x'));
        const y = Number(url.searchParams.get('y'));
        sendJson(res, 200, getMapRegion(shareAssets, mapId, x, y));
      } else if (sub === 'entities') {
        sendJson(res, 200, getMapEntities(shareAssets, mapId, pcCityMapsDir, spawnMapsDir));
      } else {
        sendJson(res, 200, {
          ok: true,
          ...getMapDefinition(shareAssets, mapId),
          backgroundUrl: getMapBackground(mapId) ? `/api/jx/map/${mapId}/background` : undefined,
          nativeArtworkUrl: getNativeMapArtwork(mapId)
        });
      }
    } catch (error) {
      if (error instanceof AssetDataError) {
        sendJson(res, error.statusCode, { ok: false, error: error.message });
        return;
      }
      console.error('Unable to load native map data:', error);
      sendJson(res, 500, { ok: false, error: 'Unable to load native map data.' });
    }
    return;
  }

  if (url.pathname === '/api/jx/assets') {
    if (!shareAssets) {
      sendJson(res, 503, { ok: false, error: 'The selected PC/mobile game data is not configured.' });
      return;
    }
    try {
      const query = url.searchParams.get('q') || '';
      const extension = url.searchParams.get('ext') || '';
      const requestedLimit = Number(url.searchParams.get('limit') || 40);
      const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 40;
      sendJson(res, 200, { ok: true, ...shareAssets.listResources(query, extension, limit) });
    } catch (error) {
      if (error instanceof AssetDataError) {
        sendJson(res, error.statusCode, { ok: false, error: error.message });
        return;
      }
      console.error('Unable to index selected share assets:', error);
      sendJson(res, 500, { ok: false, error: 'Unable to index selected share assets.' });
    }
    return;
  }

  if (url.pathname === '/api/jx/sprite.png') {
    if (!shareAssets) {
      sendJson(res, 503, { ok: false, error: 'The selected PC/mobile game data is not configured.' });
      return;
    }
    try {
      const path = url.searchParams.get('path');
      if (!path) {
        sendJson(res, 400, { ok: false, error: 'A sprite path is required.' });
        return;
      }
      const requestedFrame = Number(url.searchParams.get('frame') || 0);
      const result = spriteFramePng(shareAssets, path, requestedFrame);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': result.png.length,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'X-Sprite-Width': String(result.width),
        'X-Sprite-Height': String(result.height),
        'X-Sprite-Center-X': String(result.centerX),
        'X-Sprite-Center-Y': String(result.centerY),
        'X-Sprite-Directions': String(result.directions),
        'X-Sprite-Interval': String(result.interval),
        'X-Sprite-Frame-Count': String(result.frameCount),
        'X-Frame-Width': String(result.frameWidth),
        'X-Frame-Height': String(result.frameHeight),
        'X-Frame-Offset-X': String(result.offsetX),
        'X-Frame-Offset-Y': String(result.offsetY)
      });
      res.end(result.png);
    } catch (error) {
      if (error instanceof AssetDataError) {
        sendJson(res, error.statusCode, { ok: false, error: error.message });
        return;
      }
      console.error('Unable to convert a selected share sprite:', error);
      sendJson(res, 500, { ok: false, error: 'Unable to convert the selected share sprite.' });
    }
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, message: 'JXWeb backend is running', port, clientDir: clientDir.replace(/\\/g, '/') });
    return;
  }

  if (url.pathname === '/api/game-data') {
    sendJson(res, 200, manifest);
    return;
  }

  serveStatic(req, res);
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: 1024 * 1024 });

wss.on('connection', (ws, req) => {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  if (requestUrl.pathname === '/native') {
    if (!isLoopbackAddress(req.socket.remoteAddress)) {
      ws.close(1008, 'Native bridge is available only on the host machine');
      return;
    }
    const origin = req.headers.origin;
    const host = req.headers.host;
    let originHost: string;
    try {
      originHost = origin ? new URL(origin).host : '';
    } catch {
      originHost = '';
    }
    if (!originHost || !host || originHost.toLowerCase() !== host.toLowerCase()) {
      ws.close(1008, 'Native bridge requires same-origin access');
      return;
    }

    const nativeSocket = createConnection({ host: '127.0.0.1', port: nativeGatewayPort });
    nativeSocket.setNoDelay(true);
    nativeSocket.on('data', data => {
      if (ws.readyState === ws.OPEN) ws.send(data, { binary: true });
    });
    nativeSocket.on('error', error => {
      console.error(`Native TCP bridge failed: ${error.message}`);
      if (ws.readyState === ws.OPEN) ws.close(1011, 'Native gateway unavailable');
    });
    nativeSocket.on('close', () => {
      if (ws.readyState === ws.OPEN) ws.close(1011, 'Native gateway closed');
    });
    ws.on('message', (data: RawData, isBinary) => {
      if (!isBinary) {
        ws.close(1003, 'Native bridge accepts binary messages only');
        nativeSocket.destroy();
        return;
      }

      const packet = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data);
      nativeSocket.write(packet);
    });
    ws.on('close', () => nativeSocket.destroy());
    ws.on('error', error => {
      console.error(`Native WebSocket bridge failed: ${error.message}`);
      nativeSocket.destroy();
    });
    return;
  }

  const player: PlayerState = {
    id: String(seq++),
    x: 160 + Math.random() * 300,
    y: 120 + Math.random() * 220,
    name: `Hiệp sĩ ${seq}`,
    color: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`,
    zoneId: 37,
    fac: 'shaolin',
    lvl: 1,
    act: 'st',
    dir: 0
  };

  players.set(ws, player);
  playerChatTimes.set(ws, 0);
  ws.send(JSON.stringify({ type: 'welcome', playerId: player.id }));
  broadcastState();

  ws.on('message', raw => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'player-update') {
        player.x = Number(message.x ?? player.x);
        player.y = Number(message.y ?? player.y);
        player.name = String(message.name ?? player.name).slice(0, 32);
        if (message.zoneId !== undefined) player.zoneId = Number(message.zoneId);
        if (message.fac !== undefined) player.fac = String(message.fac).slice(0, 32);
        if (message.lvl !== undefined) player.lvl = Number(message.lvl);
        if (message.act !== undefined) player.act = String(message.act).slice(0, 16);
        if (message.dir !== undefined) player.dir = Number(message.dir);
        broadcastState();
        return;
      }

      if (message.type === 'chat') {
        const text = typeof message.text === 'string' ? message.text.trim() : '';
        if (message.channel !== 'world' || !text || text.length > 240) {
          ws.send(JSON.stringify({ type: 'chat-error', code: 'invalid-message' }));
          return;
        }
        const now = Date.now();
        if (now - (playerChatTimes.get(ws) || 0) < 750) {
          ws.send(JSON.stringify({ type: 'chat-error', code: 'rate-limit' }));
          return;
        }
        playerChatTimes.set(ws, now);
        broadcast({
          type: 'chat',
          channel: 'world',
          playerId: player.id,
          name: player.name,
          text,
          timestamp: now
        });
        return;
      }

      if (message.type === 'skill-cast') {
        broadcast({
          type: 'skill-cast',
          skill: String(message.skill ?? 'Unknown skill'),
          playerId: player.id,
          x: player.x,
          y: player.y,
          zoneId: player.zoneId,
          dir: player.dir,
          timestamp: Date.now()
        });
      }
    } catch {
      // ignore malformed payloads
    }
  });

  ws.on('close', () => {
    const leftId = player.id;
    players.delete(ws);
    broadcast({ type: 'player-left', playerId: leftId });
    broadcastState();
  });
});

function broadcastState() {
  broadcast({
    type: 'players',
    players: [...players.values()]
  });
}

function broadcast(payload: Record<string, unknown>) {
  const data = JSON.stringify(payload);
  for (const ws of players.keys()) {
    if (ws.readyState === 1) {
      ws.send(data);
    }
  }
}

httpServer.listen(port, host, () => {
  if (host === '0.0.0.0' || host === '::') {
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses || []) {
        if (address.family === 'IPv4' && !address.internal) {
          console.log(`LAN access: http://${address.address}:${port}`);
        }
      }
    }
  } else {
    console.log(`JXWeb server: http://${host}:${port}`);
  }
  console.log(shareAssets
    ? `Selected PC/mobile PAK source: ${shareAssets.info.packCount} packages`
    : 'Selected PC/mobile PAK source is not configured (set JX_CLIENT_DIR).');
});

httpServer.on('close', () => shareAssets?.close());
