import iconv from 'iconv-lite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AssetDataError, JxShareAssetStore, normalizeAssetPath } from './jx-assets.js';

export const REGION_SIZE = 512;
const REGION_HEIGHT_MPS = 1024;
const REGION_SECTION_COUNT = 6;
const GROUND_SECTION = 4;
const BUILDIN_SECTION = 5;
const GROUND_OBJECT_SIZE = 146;
const BUILDIN_OBJECT_SIZE = 228;
const MAX_REGION_DATA_SIZE = 16 * 1024 * 1024;

export type MapRect = { left: number; top: number; right: number; bottom: number };
export type MapSprite = { path: string; frame: number; x: number; bottomY: number; order: number };

export type RegionMapData = {
  ok: true;
  mapId: number;
  region: { x: number; y: number };
  groundTiles: MapSprite[];
  groundObjects: MapSprite[];
  builtins: Array<MapSprite & { y?: number; width: number; height: number; sort: number }>;
};

export interface MapCatalogEntry {
  id: number;
  name: string;
  type: 'capital' | 'city' | 'village' | 'sect' | 'cave' | 'field';
  typeLabel: string;
  path: string;
  levelRange: string;
  description: string;
  defaultSpawn?: { x: number; y: number };
}

export const MAP_CATALOG: MapCatalogEntry[] = [
  // 1. Thất Đại Thành Thị (7 Great Cities)
  { id: 37, name: 'Biện Kinh', type: 'capital', typeLabel: 'Đại Đô Thành', path: '中原北区\\汴京\\汴京', levelRange: 'Cấp 10 - 90', description: 'Kinh đô phồn hoa phương Bắc, trung tâm giao thương sầm uất nhất giang hồ.' },
  { id: 176, name: 'Lâm An', type: 'capital', typeLabel: 'Đại Đô Thành', path: '江南区\\临安\\临安', levelRange: 'Cấp 10 - 90', description: 'Kinh đô hoa lệ phương Nam, non xanh nước biếc, lầu son gác tía bên bờ Tây Hồ.' },
  { id: 1, name: 'Phượng Tường', type: 'city', typeLabel: 'Thành Thị', path: '西北南区\\凤翔', levelRange: 'Cấp 10 - 80', description: 'Trấn thành Tây Bắc uy nghiêm, cửa ngõ giao thương con đường tơ lụa.' },
  { id: 11, name: 'Thành Đô', type: 'city', typeLabel: 'Thành Thị', path: '西南北区\\成都\\成都', levelRange: 'Cấp 10 - 80', description: 'Vùng đất Thục trù phú thanh bình, danh lam thắng cảnh đệ nhất Tây Nam.' },
  { id: 78, name: 'Tương Dương', type: 'city', typeLabel: 'Thành Thị', path: '中原南区\\襄阳\\襄阳', levelRange: 'Cấp 10 - 80', description: 'Cổ thành chiến lược kiên cố bên sông Hán Thủy, chiến địa ngàn năm rực lửa.' },
  { id: 80, name: 'Dương Châu', type: 'city', typeLabel: 'Thành Thị', path: '中原南区\\扬州', levelRange: 'Cấp 10 - 80', description: 'Thành phố kênh đào diễm lệ Giang Nam, đệ nhất tài tử giai nhân tụ hội.' },
  { id: 162, name: 'Đại Lý', type: 'city', typeLabel: 'Thành Thị', path: '西南南区\\大理\\大理府', levelRange: 'Cấp 10 - 80', description: 'Vương quốc miền biên viễn Nam Chiếu, phong cảnh hữu tình của dòng họ Đoàn.' },

  // 2. Thôn Trấn (Novice Villages)
  { id: 53, name: 'Ba Lăng Huyện', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '两湖区\\巴陵县', levelRange: 'Cấp 1 - 10', description: 'Vùng đất khởi đầu quen thuộc của mọi thiếu hiệp khi bước chân vào võ lâm.' },
  { id: 20, name: 'Giang Tân Thôn', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '西南北区\\江津村', levelRange: 'Cấp 1 - 10', description: 'Bến thuyền yên ả ven Trường Giang, nơi các hiệp khách bắt đầu hành trình.' },
  { id: 54, name: 'Nam Nhạc Trấn', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '两湖区\\南岳镇', levelRange: 'Cấp 1 - 10', description: 'Thôn trấn tĩnh lặng dưới chân núi Hành Sơn cao vút ngút ngàn.' },
  { id: 99, name: 'Vĩnh Lạc Trấn', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '西北南区\\永乐镇', levelRange: 'Cấp 1 - 10', description: 'Thị trấn thanh bình biên giới Tây Bắc, rèn đúc chí khí thiếu niên anh hùng.' },
  { id: 100, name: 'Chu Tiên Trấn', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '中原北区\\朱仙镇', levelRange: 'Cấp 1 - 10', description: 'Địa danh gắn liền chiến công danh tướng Nhạc Phi, không khí trượng nghĩa ngập tràn.' },
  { id: 101, name: 'Đạo Hương Thôn', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '中原南区\\稻香村', levelRange: 'Cấp 1 - 10', description: 'Ngôi làng thơm ngát hương lúa Trung Nguyên, yên ả như một bức tranh thủy mặc.' },
  { id: 121, name: 'Long Môn Trấn', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '西北北区\\龙门镇', levelRange: 'Cấp 1 - 10', description: 'Trấn hoang mạc gió cát biên cương xa xôi, nơi ẩn náu của nhiều kỳ nhân dị sĩ.' },
  { id: 153, name: 'Thạch Cổ Trấn', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '西南南区\\石鼓镇', levelRange: 'Cấp 1 - 10', description: 'Thôn trấn đá cổ miền cao nguyên Tây Nam, tiếng trống đá vang vọng núi rừng.' },
  { id: 174, name: 'Long Tuyền Thôn', type: 'village', typeLabel: 'Tân Thủ Thôn', path: '江南区\\龙泉', levelRange: 'Cấp 1 - 10', description: 'Ngôi làng nổi tiếng với nghề đúc bảo kiếm trứ danh thiên hạ bên suối Rồng.' },

  // 3. Thập Đại Môn Phái (10 Sects)
  { id: 103, name: 'Thiếu Lâm Phái', type: 'sect', typeLabel: 'Môn Phái (Kim)', path: '中原北区\\少林派\\少林派', levelRange: 'Môn phái', description: 'Thiền tông tổ đình, Thái sơn Bắc đẩu của võ lâm Trung Nguyên.' },
  { id: 25, name: 'Đường Môn', type: 'sect', typeLabel: 'Môn Phái (Mộc)', path: '西南北区\\唐门\\唐门', levelRange: 'Môn phái', description: 'Thế gia ám khí và cạm bẫy bí hiểm nhất vùng Tứ Xuyên Ba Thục.' },
  { id: 13, name: 'Nga My Phái', type: 'sect', typeLabel: 'Môn Phái (Thủy)', path: '西南北区\\峨嵋派\\峨嵋派', levelRange: 'Môn phái', description: 'Đỉnh Nga My thanh tịnh ngút ngàn mây trắng, thánh địa nữ hiệp từ bi trượng nghĩa.' },
  { id: 45, name: 'Thiên Nhẫn Giáo', type: 'sect', typeLabel: 'Môn Phái (Hỏa)', path: '中原北区\\天忍教\\天忍教室外', levelRange: 'Môn phái', description: 'Giáo phái bí ẩn của Kim quốc, võ công tà dị cuồng bạo như lửa thiêu.' },
  { id: 81, name: 'Võ Đang Phái', type: 'sect', typeLabel: 'Môn Phái (Thổ)', path: '中原南区\\武当派\\武当派', levelRange: 'Môn phái', description: 'Đạo gia thánh địa trên đỉnh núi Võ Đang, dĩ nhu khắc cương, Thái Cực huyền ảo.' },
  { id: 115, name: 'Cái Bang', type: 'sect', typeLabel: 'Môn Phái (Hỏa)', path: '中原南区\\丐帮\\丐帮', levelRange: 'Môn phái', description: 'Đệ nhất đại bang giang hồ, Hàng Long Thập Bát Chưởng uy chấn bát hoang.' },
  { id: 131, name: 'Côn Lôn Phái', type: 'sect', typeLabel: 'Môn Phái (Thổ)', path: '西北北区\\昆仑派\\昆仑派', levelRange: 'Môn phái', description: 'Môn phái đạo gia sừng sững trên đỉnh Côn Lôn tuyết trắng vĩnh cửu.' },

  // 4. Động Phủ & Phụ Bản Ải (Caves & Dungeons)
  { id: 38, name: 'Thiết Tháp Tầng 1', type: 'cave', typeLabel: 'Mê Cung Động Phủ', path: '中原北区\\汴京\\铁塔迷宫', levelRange: 'Cấp 20 - 30', description: 'Cổ tháp bí ẩn dưới lòng Biện Kinh, chứa nhiều cạm bẫy và kho tàng cổ đại.' },
  { id: 4, name: 'Kim Quang Động', type: 'cave', typeLabel: 'Mê Cung Động Phủ', path: '西北南区\\剑阁西北\\金光洞迷宫', levelRange: 'Cấp 30 - 40', description: 'Động đá ánh vàng huyền bí vùng Kiếm Các hiểm trở, dã thú hung tợn chiếm giữ.' },
  { id: 5, name: 'Kinh Hoàng Động', type: 'cave', typeLabel: 'Mê Cung Động Phủ', path: '西北南区\\剑阁西北\\经皇洞迷宫', levelRange: 'Cấp 40 - 50', description: 'Hang động sâu thăm thẳm u tối, nơi ẩn náu của bọn cường đạo khét tiếng.' },
  { id: 22, name: 'Bạch Vân Động', type: 'cave', typeLabel: 'Mê Cung Động Phủ', path: '西南北区\\青城山\\白云洞迷宫', levelRange: 'Cấp 50 - 60', description: 'Mê cung mây mù vây kín trên đỉnh Thanh Thành Sơn cao vời vợi.' },
  { id: 8, name: 'Lăng Tần Thủy Hoàng', type: 'cave', typeLabel: 'Hoàng Lăng Cấm Địa', path: '西北南区\\秦陵\\秦始皇陵地下一层', levelRange: 'Cấp 60 - 80', description: 'Địa cung ngàn năm chôn cất Thủy Hoàng Đế, binh mã dũng mãnh canh giữ kho báu vô tận.' },
  { id: 125, name: 'Lưu Tiên Động Tầng 1', type: 'cave', typeLabel: 'Mê Cung Động Phủ', path: '西北北区\\黄河源头\\留仙洞一层', levelRange: 'Cấp 70 - 90', description: 'Hang động tiên cảnh nơi thượng nguồn Hoàng Hà, cao thủ tà giáo tụ tập.' }
];

const mapRectCache = new Map<string, MapRect>();
const regionCache = new Map<string, RegionMapData>();

function resolveMapPaths(store: JxShareAssetStore, entry: MapCatalogEntry): { worPath: string; regBaseDir: string } {
  const subName = entry.path.split('\\').pop() || '';
  const candidates = [
    `\\maps\\${entry.path}.wor`,
    `\\maps\\${entry.path}\\${subName}.wor`,
    `\\maps\\${entry.path}\\world.wor`
  ];
  for (const candidate of candidates) {
    try {
      store.getAssetData(candidate);
      return { worPath: candidate, regBaseDir: candidate.slice(0, -4) };
    } catch {
      // try next
    }
  }
  throw new AssetDataError(`Map .wor configuration not found for: ${entry.name} (${entry.path})`, 404);
}

export function readMapRectForEntry(store: JxShareAssetStore, entry: MapCatalogEntry): { rect: MapRect; regBaseDir: string } {
  const cacheKey = `${entry.id}`;
  const { worPath, regBaseDir } = resolveMapPaths(store, entry);
  const cachedRect = mapRectCache.get(cacheKey);
  if (cachedRect) return { rect: cachedRect, regBaseDir };

  const wor = store.getAssetData(worPath).toString('latin1');
  let inMain = false;
  let value: string | undefined;
  for (const line of wor.split(/\r?\n/)) {
    const section = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (section) {
      inMain = section[1].toLowerCase() === 'main';
      continue;
    }
    if (inMain) {
      const rectMatch = /^\s*rect\s*=\s*(.*?)\s*$/i.exec(line);
      if (rectMatch) {
        value = rectMatch[1];
        break;
      }
    }
  }

  const match = value && /^(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)$/.exec(value);
  if (!match) {
    throw new AssetDataError(`Map ${entry.name} does not contain a valid MAIN.rect.`, 422);
  }

  const rect: MapRect = {
    left: Number(match[1]),
    top: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4])
  };

  mapRectCache.set(cacheKey, rect);
  return { rect, regBaseDir };
}

function sectionData(region: Buffer, sectionIndex: number): Buffer {
  if (region.length < 4) throw new AssetDataError('Region_C.dat header is truncated.', 422);
  const count = region.readUInt32LE(0);
  if (count < REGION_SECTION_COUNT || count > 32 || region.length < 4 + count * 8) {
    throw new AssetDataError('Region_C.dat has an invalid section table.', 422);
  }
  const entry = 4 + sectionIndex * 8;
  const sectionBase = 4 + count * 8;
  const offset = region.readUInt32LE(entry);
  const length = region.readUInt32LE(entry + 4);
  if (length === 0) return Buffer.alloc(0);
  if (length > MAX_REGION_DATA_SIZE || offset + length > region.length - sectionBase) {
    throw new AssetDataError('Region_C.dat section exceeds the file bounds.', 422);
  }
  return region.subarray(sectionBase + offset, sectionBase + offset + length);
}

function readName(bytes: Buffer): string {
  const end = bytes.indexOf(0);
  const value = iconv.decode(end < 0 ? bytes : bytes.subarray(0, end), 'gbk').trim();
  return value ? normalizeAssetPath(value) : '';
}

function parseGround(data: Buffer, regionX: number, regionY: number): {
  tiles: MapSprite[];
  objects: MapSprite[];
} {
  if (!data.length) return { tiles: [], objects: [] };
  if (data.length < 12) throw new AssetDataError('Ground.dat header is truncated.', 422);
  const tileCount = data.readUInt32LE(0);
  const objectCount = data.readUInt32LE(4);
  const objectOffset = data.readUInt32LE(8);
  if (tileCount > 100_000 || objectCount > 100_000 ||
      objectOffset < 12 || objectOffset > data.length) {
    throw new AssetDataError('Ground.dat has invalid record counts or offsets.', 422);
  }

  const tiles: MapSprite[] = [];
  let offset = 12;
  for (let index = 0; index < tileCount; index += 1) {
    if (offset + 8 > objectOffset) throw new AssetDataError('Ground.dat tile record is truncated.', 422);
    const h = data.readUInt16LE(offset);
    const v = data.readUInt16LE(offset + 2);
    const frame = data.readUInt16LE(offset + 4);
    const nameLength = data.readUInt16LE(offset + 6);
    offset += 8;
    if (nameLength > 128 || offset + nameLength > objectOffset) {
      throw new AssetDataError('Ground.dat tile resource name is invalid.', 422);
    }
    const path = readName(data.subarray(offset, offset + nameLength));
    offset += nameLength;
    if (path) {
      tiles.push({ path, frame, x: regionX * REGION_SIZE + h * 32, bottomY: regionY * REGION_SIZE + v * 32, order: index });
    }
  }

  const objects: MapSprite[] = [];
  offset = objectOffset;
  if (offset + objectCount * GROUND_OBJECT_SIZE > data.length) {
    throw new AssetDataError('Ground.dat cover-object records are truncated.', 422);
  }
  for (let index = 0; index < objectCount; index += 1) {
    const record = data.subarray(offset, offset + GROUND_OBJECT_SIZE);
    const path = readName(record.subarray(8, 136));
    if (path) {
      objects.push({
        path,
        frame: record.readUInt16LE(140),
        x: record.readInt32LE(0),
        bottomY: record.readInt32LE(4) / 2,
        order: record.readUInt8(143) * 65536 + record.readInt16LE(144) + index
      });
    }
    offset += GROUND_OBJECT_SIZE;
  }
  return { tiles, objects };
}

function parseBuiltins(data: Buffer): RegionMapData['builtins'] {
  if (!data.length) return [];
  if (data.length < 16) throw new AssetDataError('BuildinObj.Dat header is truncated.', 422);
  const count = data.readUInt32LE(0);
  const treeCount = data.readUInt16LE(4);
  const lineCount = data.readUInt16LE(6);
  const pointCount = data.readUInt16LE(8);
  const aboveCount = data.readUInt16LE(10);
  if (count > 100_000 || treeCount + lineCount + pointCount + aboveCount !== count ||
      16 + count * BUILDIN_OBJECT_SIZE > data.length) {
    throw new AssetDataError('BuildinObj.Dat has invalid record counts or size.', 422);
  }

  const builtins: RegionMapData['builtins'] = [];
  for (let index = 0; index < count; index += 1) {
    const offset = 16 + index * BUILDIN_OBJECT_SIZE;
    const record = data.subarray(offset, offset + BUILDIN_OBJECT_SIZE);
    const path = readName(record.subarray(56, 184));
    if (!path) continue;
    const props = record.readUInt32LE(0);
    const imgX = record.readInt32LE(4);
    const imgY = record.readInt32LE(8);
    const imgZ = record.readInt32LE(12);
    const width = Math.max(0, record.readInt16LE(52));
    const height = Math.max(0, record.readInt16LE(54));
    // Authentic Kingsoft JX PC isometric projection: nY / 2 - ((nZ * 887) >> 10)
    const zOffset = (imgZ * 887) >> 10;
    const topY = Math.floor(imgY / 2) - zOffset;
    const sort = (props >>> 8) & 3;
    builtins.push({
      path,
      frame: record.readUInt16LE(188),
      x: imgX,
      y: topY,
      bottomY: topY + height,
      order: record.readUInt16LE(194) * 65536 + index,
      width,
      height,
      sort
    });
  }
  return builtins;
}

export function getMapList(): MapCatalogEntry[] {
  return MAP_CATALOG;
}

export function getMapDefinition(store: JxShareAssetStore, mapId: number) {
  const entry = MAP_CATALOG.find(m => m.id === mapId) || MAP_CATALOG[0];
  const { rect } = readMapRectForEntry(store, entry);

  const midRx = Math.floor((rect.left + rect.right) / 2);
  const midRy = Math.floor((rect.top + rect.bottom) / 2);
  const defaultSpawn = {
    x: midRx * REGION_SIZE + 256,
    y: midRy * REGION_SIZE + 256
  };

  const mapWidth = (rect.right - rect.left + 1) * REGION_SIZE;
  const mapHeight = (rect.bottom - rect.top + 1) * REGION_SIZE;

  return {
    mapId: entry.id,
    name: entry.name,
    type: entry.type,
    typeLabel: entry.typeLabel,
    levelRange: entry.levelRange,
    description: entry.description,
    coordinateType: 'region coordinates; sprite positions use native screen units (Y is source MPS Y / 2)',
    regionSize: REGION_SIZE,
    regionHeightMps: REGION_HEIGHT_MPS,
    rect,
    defaultSpawn,
    mapWidth,
    mapHeight
  };
}

export function getMapRegion(store: JxShareAssetStore, mapId: number, x: number, y: number): RegionMapData {
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new AssetDataError('Region coordinates must be integers.');
  }
  const entry = MAP_CATALOG.find(m => m.id === mapId) || MAP_CATALOG[0];
  const { rect, regBaseDir } = readMapRectForEntry(store, entry);

  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    throw new AssetDataError(`Requested region (${x}, ${y}) is outside map ${entry.name}.`, 404);
  }

  const key = `${mapId}:${x}:${y}`;
  const cached = regionCache.get(key);
  if (cached) {
    regionCache.delete(key);
    regionCache.set(key, cached);
    return cached;
  }

  const regionPath = `${regBaseDir}\\v_${String(y).padStart(3, '0')}\\${String(x).padStart(3, '0')}_Region_C.dat`;
  const region = store.getAssetData(regionPath);
  const ground = parseGround(sectionData(region, GROUND_SECTION), x, y);
  const result: RegionMapData = {
    ok: true,
    mapId,
    region: { x, y },
    groundTiles: ground.tiles,
    groundObjects: ground.objects,
    builtins: parseBuiltins(sectionData(region, BUILDIN_SECTION))
  };

  regionCache.set(key, result);
  while (regionCache.size > 128) regionCache.delete(regionCache.keys().next().value!);
  return result;
}

export interface MapNpcEntity {
  id: number | string;
  name: string;
  title: string;
  role: 'coachman' | 'datau' | 'shop' | 'blacksmith' | 'faction' | 'storage' | 'dialog';
  x: number;
  y: number;
  spr: string;
  dialogs: string[];
}

export interface MapMonsterEntity {
  id: number;
  name: string;
  level: number;
  element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
  x: number;
  y: number;
  enemyCode: string;
  hp: number;
  attack: number;
  /** Npcs.txt STT template id when resolved from native data; -1 for legacy fallback. */
  templateId: number;
  /** Npcs.txt NpcResType when resolved from native data (e.g. ani018). */
  resType: string;
  /** Native PAK sprite base path without action suffix (e.g. \spr\npcres\animal\ani018\ani018). */
  sprBase?: string;
  /** Attack sprite path override for templates that do not follow the <base>_at.spr convention. */
  sprAt?: string;
}

/** Native monster spawn anchor read from Settings\maps\{village_out,city_out}\<mapId>.txt.
 *  File unit is the JX MPS cell: screenX = nPosX * 32, screenY = nPosY * 16 (Y is MPS, halved). */
export interface NativeSpawnAnchor {
  x: number;
  y: number;
}

export interface NativeMonsterTemplate {
  templateId: number;
  name: string;
  element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
  resType: string;
  sprBase: string;
}

export interface NativeMonsterTemplate {
  templateId: number;
  name: string;
  element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
  resType: string;
  sprBase: string;
  /** Attack sprite path override when the template does not follow the <base>_at.spr convention. */
  sprAt?: string;
}

/** Verified native monster roster for the full map catalog.
 *  Sources:
 *   - Settings\Npcs.txt (Kind=0 combat templates, TCVN3-encoded Name / GBK-encoded NpcResType)
 *   - Settings\MapList.ini (per-map NpcSeries* weights and NpcAutoLevelMin/Max bands)
 *  Roster *selection* per map is inferred from the level band and series weights; every
 *  field value (id, name, element, sprite path) is native data, not invented.
 *  Boss templates are the (sơ cấp) tiểu Boss / đại Boss entries present in Npcs.txt.
 */
const MAP_NATIVE_ROSTER: Record<number, { monsters: NativeMonsterTemplate[]; boss: NativeMonsterTemplate }> = {
  // --- Thất Đại Thành Thị (cities, level band 10-90, series 20/20/20/20/20) ---
  37: { // Biện Kinh
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  176: { // Lâm An
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  1: { // Phượng Tường
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  11: { // Thành Đô
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  78: { // Tương Dương
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  80: { // Dương Châu
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  162: { // Đại Lý
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  // --- Tân Thủ Thôn (villages, level band 1-10) ---
  53: { // Ba Lăng Huyện
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  20: { // Giang Tân Thôn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  54: { // Nam Nhạc Trấn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  99: { // Vĩnh Lạc Trấn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  100: { // Chu Tiên Trấn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  101: { // Đạo Hương Thôn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  121: { // Long Môn Trấn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  153: { // Thạch Cổ Trấn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  174: { // Long Tuyền Thôn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  // --- Thập Đại Môn Phái / Tông ---
  103: { // Thiếu Lâm Phái
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  25: { // Đường Môn
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  13: { // Nga My Phái
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  45: { // Thiên Nhẫn Giáo
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  81: { // Võ Đang Phái
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  115: { // Cái Bang
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  131: { // Côn Lôn Phái
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 2, name: 'Hoa Nam hổ', element: 'Mộc', resType: 'ani002', sprBase: '\\spr\\npcres\\animal\\ani002\\ani002' },
      { templateId: 18, name: 'Trâu rừng', element: 'Thủy', resType: 'ani029', sprBase: '\\spr\\npcres\\animal\\ani029\\ani029' },
      { templateId: 14, name: 'Voi Châu á', element: 'Hỏa', resType: 'ani021', sprBase: '\\spr\\npcres\\animal\\ani021\\ani021' },
      { templateId: 15, name: 'Voi Hoàng hà', element: 'Thổ', resType: 'ani024', sprBase: '\\spr\\npcres\\animal\\ani024\\ani024' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  // --- Mê Cung / Động Phủ (caves, level bands and series weights from MapList.ini) ---
  38: { // Thiết Tháp Tầng 1 — lvl55, Metal70/Water30
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  },
  4: { // Kim Quang Động — lvl35, Metal80/Water20
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  5: { // Kinh Hoàng Động — lvl45, Wood80/Fire20
    monsters: [
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  22: { // Bạch Vân Động — lvl35, Fire80/Earth20
    monsters: [
      { templateId: 154, name: 'Giang Nam sơn tặc 1', element: 'Hỏa', resType: 'enemy134', sprBase: '\\spr\\npcres\\enemy\\enemy134\\enemy134' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  8: { // Lăng Tần Thủy Hoàng — lvl35, Metal20/Earth80
    monsters: [
      { templateId: 6, name: 'Sói xám', element: 'Kim', resType: 'ani009', sprBase: '\\spr\\npcres\\animal\\ani009\\ani009' },
      { templateId: 150, name: 'Tây Bắc sơn tặc 1', element: 'Thổ', resType: 'enemy130', sprBase: '\\spr\\npcres\\enemy\\enemy130\\enemy130' }
    ],
    boss: { templateId: 995, name: '(sơ cấp) tiểu Boss nam 1', element: 'Kim', resType: 'boss006', sprBase: '\\spr\\npcres\\boss\\boss006\\boss006', sprAt: '\\spr\\npcres\\boss\\boss006\\boss006_at1.spr' }
  },
  125: { // Lưu Tiên Động Tầng 1 — lvl55, Wood30/Water70
    monsters: [
      { templateId: 12, name: 'Heo rừng', element: 'Mộc', resType: 'ani018', sprBase: '\\spr\\npcres\\animal\\ani018\\ani018' },
      { templateId: 13, name: 'Nhím', element: 'Thủy', resType: 'ani019', sprBase: '\\spr\\npcres\\animal\\ani019\\ani019' }
    ],
    boss: { templateId: 1007, name: 'Đại Boss', element: 'Kim', resType: 'boss015', sprBase: '\\spr\\npcres\\boss\\boss015\\boss015', sprAt: '\\spr\\npcres\\boss\\boss015\\boss015_at01.spr' }
  }
};

function readSpawnAnchorFile(filePath: string, mapId: number): NativeSpawnAnchor[] {
  const points: NativeSpawnAnchor[] = [];
  let rows: string[];
  try {
    rows = readFileSync(filePath, 'latin1').replace(/^\uFEFF/, '').split(/\r?\n/);
  } catch {
    return points;
  }
  for (const line of rows) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cells = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(/\s+/);
    if (cells.length < 2) continue;
    const px = Number(cells[0]);
    const py = Number(cells[1]);
    const mid = cells.length >= 3 ? Number(cells[2]) : mapId;
    if (!Number.isFinite(px) || !Number.isFinite(py) || px <= 0 || py <= 0) continue;
    if (Number.isFinite(mid) && mid !== mapId) continue;
    points.push({ x: px * 32, y: py * 16 });
  }
  return points;
}

export function readNativeSpawnAnchors(
  spawnMapsDir: string | undefined,
  mapId: number,
  mapDef: { rect: MapRect }
): { points: NativeSpawnAnchor[]; files: string[] } {
  const points: NativeSpawnAnchor[] = [];
  const files: string[] = [];
  if (!spawnMapsDir) return { points, files };
  const minX = mapDef.rect.left * REGION_SIZE;
  const maxX = (mapDef.rect.right + 1) * REGION_SIZE;
  const minY = mapDef.rect.top * REGION_SIZE;
  const maxY = (mapDef.rect.bottom + 1) * REGION_SIZE;
  for (const sub of ['village_out', 'city_out']) {
    const filePath = resolve(spawnMapsDir, sub, `${mapId}.txt`);
    if (!existsSync(filePath)) continue;
    const parsed = readSpawnAnchorFile(filePath, mapId)
      .filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
    if (parsed.length > 0) {
      files.push(`${sub}/${mapId}.txt`);
      points.push(...parsed);
    }
  }
  return { points, files };
}

export function getMapEntities(store: JxShareAssetStore, mapId: number, pcCityMapsDir?: string, spawnMapsDir?: string): {
  ok: true;
  mapId: number;
  npcs: MapNpcEntity[];
  monsters: MapMonsterEntity[];
  sources: {
    npcPositions: string;
    monsterPositions: string;
    monsterTemplates: string;
  };
} {
  const mapDef = getMapDefinition(store, mapId);
  const spawnX = mapDef.defaultSpawn.x;
  const spawnY = mapDef.defaultSpawn.y;

  const npcs: MapNpcEntity[] = [];
  const monsters: MapMonsterEntity[] = [];

  // 1. Try reading authentic coordinates from City<mapId>.map
  let foundCityPoints: { x: number; y: number }[] = [];
  if (pcCityMapsDir) {
    const cityMapPath = resolve(pcCityMapsDir, `City${mapId}.map`);
    if (existsSync(cityMapPath)) {
      try {
        const lines = readFileSync(cityMapPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < Math.min(15, lines.length); i++) {
          const m = /^(-?\d+)\s*,\s*(-?\d+)$/.exec(lines[i]);
          if (m) {
            const px = Number(m[1]);
            const py = Number(m[2]) / 2; // screen coordinates
            if (px > 0 && py > 0) foundCityPoints.push({ x: px, y: py });
          }
        }
      } catch {}
    }
  }

  // Fallback anchor positions around the city square and gate approaches when native map data is absent.
  // This keeps NPCs visible in authentic town layouts instead of collapsing them onto the exact center.
  const pStorage = foundCityPoints[0] || { x: spawnX - 460, y: spawnY - 220 };
  const pDriver = foundCityPoints[1] || { x: spawnX + 520, y: spawnY + 180 };
  const pGroceries = foundCityPoints[5] || { x: spawnX + 220, y: spawnY - 340 };
  const pPharmacy = foundCityPoints[6] || { x: spawnX - 300, y: spawnY + 300 };
  const pFaction = foundCityPoints[7] || { x: spawnX + 120, y: spawnY - 520 };
  const pBlacksmith = foundCityPoints[8] || { x: spawnX + 420, y: spawnY - 180 };
  const pDaTau = foundCityPoints[10] || { x: spawnX - 80, y: spawnY + 30 };

  // Generate Authentic NPCs
  npcs.push(
    {
      id: `${mapId}_driver`,
      name: `Xa Phu ${mapDef.name}`,
      title: 'Dịch Trạm Xa Phu',
      role: 'coachman',
      x: pDriver.x,
      y: pDriver.y,
      spr: '\\spr\\npcres\\passerby\\passerby040\\passerby040s1.spr',
      dialogs: ['Đi đâu đây đại hiệp? Ngựa tốt của ta sẽ đưa người chu du khắp chốn giang hồ!']
    },
    {
      id: `${mapId}_datau`,
      name: 'Dã Tẩu',
      title: 'Thiên Hạ Đệ Nhất Thông',
      role: 'datau',
      x: pDaTau.x,
      y: pDaTau.y,
      spr: '\\spr\\npcres\\passerby\\passerby192\\passerby192_st.spr',
      dialogs: ['Hỡi thiếu hiệp, lão có nhiều nhiệm vụ kỳ bí đang đợi người khám phá!']
    },
    {
      id: `${mapId}_pharmacy`,
      name: 'Chủ Dược Điếm',
      title: 'Thần Y Trị Thương',
      role: 'shop',
      x: pPharmacy.x,
      y: pPharmacy.y,
      spr: '\\spr\\npcres\\passerby\\passerby007\\passerby007z.spr',
      dialogs: ['Kim Sáng Dược, Ngưng Thần Đan, giải bách độc, hồi phục sinh lực thần kỳ!']
    },
    {
      id: `${mapId}_blacksmith`,
      name: 'Thợ Rèn',
      title: 'Đúc Kiếm Danh Sư',
      role: 'blacksmith',
      x: pBlacksmith.x,
      y: pBlacksmith.y,
      spr: '\\spr\\npcres\\passerby\\passerby004\\passerby004s1.spr',
      dialogs: ['Binh khí sắc bén là bạn đồng hành đắc lực nhất của người hiệp khách.']
    },
    {
      id: `${mapId}_faction`,
      name: 'Sứ Giả Môn Phái',
      title: 'Chưởng Môn Tiếp Dẫn',
      role: 'faction',
      x: pFaction.x,
      y: pFaction.y,
      spr: '\\spr\\npcres\\passerby\\passerby178\\passerby178_st.spr',
      dialogs: ['Võ Lâm ngũ hành tương sinh tương khắc, thiếu hiệp đã chọn cho mình con đường võ đạo nào?']
    }
  );

  // Monsters: spawn authentic monsters strictly OUTSIDE city & village gates (Bãi quái ngoài thành/thôn)
  const isCity = mapDef.type === 'capital' || mapDef.type === 'city';
  const isVillage = mapDef.type === 'village';
  const isCave = mapDef.type === 'cave';

  const baseLvl = isVillage ? 2 : isCity ? 15 : 35;
  const mobCount = isCave ? 16 : 16;

  // Town/village mobs should be placed around the outer ring and gate approaches,
  // never directly inside the settlement core where the player and NPCs are centered.
  const sealRadius = isVillage ? 720 : 980;
  const innerSafeRadius = isVillage ? 260 : 420;
  const townGateBias = isVillage ? 240 : 360;

  // Native monster spawn anchors: Settings\maps\{village_out,city_out}\<mapId>.txt
  // (verified native data; falls back to the procedural ring when files are absent).
  const nativeAnchors = isCave ? { points: [], files: [] as string[] }
    : readNativeSpawnAnchors(spawnMapsDir, mapId, mapDef);
  const useNativeAnchors = nativeAnchors.points.length > 0;
  // Native template roster (Npcs.txt). Every catalogued map has a verified native roster;
  // only the roster *selection* is inferred, all field values are native data.
  const nativeRoster = MAP_NATIVE_ROSTER[mapId];
  const useNativeRoster = Boolean(nativeRoster);

  const legacyTemplates = [
    { name: isVillage ? 'Heo Rừng' : 'Ác Tăng', enemyCode: 'enemy003', elem: 'Kim' as const },
    { name: isVillage ? 'Nhím Gai' : 'Thợ Săn Hung Hãn', enemyCode: 'enemy005', elem: 'Mộc' as const },
    { name: isVillage ? 'Thổ Phỉ Ngoài Thôn' : 'Đạo Tặc Giang Hồ', enemyCode: 'enemy015', elem: 'Thủy' as const },
    { name: isVillage ? 'Sơn Tặc Biên Giới' : 'Kiếm Hiệp Sa Ngã', enemyCode: 'enemy021', elem: 'Hỏa' as const },
    { name: isVillage ? 'Đao Khách Dã Ngoại' : 'Cung Thủ Hung Tợn', enemyCode: 'enemy026', elem: 'Thổ' as const }
  ];

  for (let i = 0; i < mobCount; i++) {
    const lvl = baseLvl + (i % 5);

    let template: { name: string; element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ'; enemyCode: string; templateId: number; resType: string; sprBase?: string; sprAt?: string };
    if (useNativeRoster) {
      const native = nativeRoster.monsters[i % nativeRoster.monsters.length];
      template = {
        name: native.name,
        element: native.element,
        enemyCode: native.resType.toLowerCase(),
        templateId: native.templateId,
        resType: native.resType,
        sprBase: native.sprBase,
        sprAt: native.sprAt
      };
    } else {
      const legacy = legacyTemplates[i % legacyTemplates.length];
      template = {
        name: legacy.name,
        element: legacy.elem,
        enemyCode: legacy.enemyCode,
        templateId: -1,
        resType: legacy.enemyCode,
        sprBase: `\\spr\\npcres\\enemy\\${legacy.enemyCode}\\${legacy.enemyCode}`
      };
    }

    let mobX = spawnX;
    let mobY = spawnY;

    if (isCave) {
      // In caves: spread along dungeon corridors (radius 400 - 1000px)
      const angle = (i / mobCount) * Math.PI * 2;
      const dist = 400 + (i % 4) * 160;
      mobX = spawnX + Math.cos(angle) * dist;
      mobY = spawnY + Math.sin(angle) * dist;
    } else if (useNativeAnchors) {
      // Deterministic scatter around the verified native spawn anchors
      // (Settings\maps\village_out|city_out\<mapId>.txt), no randomness.
      const anchor = nativeAnchors.points[i % nativeAnchors.points.length];
      const slot = Math.floor(i / nativeAnchors.points.length);
      const angle = (slot / Math.max(1, Math.ceil(mobCount / nativeAnchors.points.length))) * Math.PI * 2
        + (i % nativeAnchors.points.length) * 0.785;
      const dist = 150 + ((i * 37) % 3) * 120;
      mobX = anchor.x + Math.cos(angle) * dist;
      mobY = anchor.y + Math.sin(angle) * dist;
    } else {
      const angle = (i / mobCount) * Math.PI * 2 + (i % 3) * 0.9;
      const ring = sealRadius + (i % 4) * 140;
      const gateOffsetX = Math.cos(angle) * townGateBias;
      const gateOffsetY = Math.sin(angle) * townGateBias;
      const jitterX = Math.sin(i * 1.7) * 220;
      const jitterY = Math.cos(i * 2.3) * 220;
      mobX = spawnX + Math.cos(angle) * ring + gateOffsetX + jitterX;
      mobY = spawnY + Math.sin(angle) * ring + gateOffsetY + jitterY;

      const dx = mobX - spawnX;
      const dy = mobY - spawnY;
      const distFromCenter = Math.hypot(dx, dy) || 1;
      if (distFromCenter < innerSafeRadius) {
        const push = innerSafeRadius / distFromCenter;
        mobX = spawnX + dx * push;
        mobY = spawnY + dy * push;
      }
    }

    // Clamp inside map boundaries
    const minX = mapDef.rect.left * REGION_SIZE + 100;
    const maxX = (mapDef.rect.right + 1) * REGION_SIZE - 100;
    const minY = mapDef.rect.top * REGION_SIZE + 100;
    const maxY = (mapDef.rect.bottom + 1) * REGION_SIZE - 100;
    mobX = Math.max(minX, Math.min(maxX, mobX));
    mobY = Math.max(minY, Math.min(maxY, mobY));

    monsters.push({
      id: i + 1,
      name: template.name,
      level: lvl,
      element: template.element,
      x: Math.round(mobX),
      y: Math.round(mobY),
      enemyCode: template.enemyCode,
      hp: 180 + lvl * 50,
      attack: 25 + lvl * 8,
      templateId: template.templateId,
      resType: template.resType,
      sprBase: template.sprBase,
      sprAt: template.sprAt
    });
  }

  // Cave / Dungeon Boss — native boss template from Npcs.txt when available
  if (isCave && nativeRoster?.boss) {
    const boss = nativeRoster.boss;
    monsters.push({
      id: 999,
      name: boss.name,
      level: baseLvl + 10,
      element: boss.element,
      x: spawnX + 200,
      y: spawnY + 200,
      enemyCode: boss.resType.toLowerCase(),
      hp: (180 + baseLvl * 50) * 5,
      attack: (25 + baseLvl * 8) * 2,
      templateId: boss.templateId,
      resType: boss.resType,
      sprBase: boss.sprBase,
      sprAt: boss.sprAt
    });
  } else if (isCave) {
    monsters.push({
      id: 999,
      name: `Động Chủ ${mapDef.name}`,
      level: baseLvl + 10,
      element: 'Kim',
      x: spawnX + 200,
      y: spawnY + 200,
      enemyCode: 'boss001',
      hp: (180 + baseLvl * 50) * 5,
      attack: (25 + baseLvl * 8) * 2,
      templateId: -1,
      resType: 'boss001'
    });
  }

  const sources = {
    npcPositions: foundCityPoints.length > 0
      ? `native City${mapId}.map auto-navigation points (PC/mobile)`
      : 'procedural fallback around map center (no native City points found)',
    monsterPositions: useNativeAnchors
      ? `native Settings\\maps\\{${nativeAnchors.files.join(', ')}} spawn anchors`
      : (isCave ? 'procedural cave corridor scatter (no native table verified)' : 'procedural ring scatter (no native anchor file found)'),
    monsterTemplates: useNativeRoster
      ? `native Settings\\Npcs.txt templates (Kind=0, roster selection inferred from MapList.ini level band/series)`
      : 'legacy procedural template set (not verified against Npcs.txt)'
  };

  return { ok: true, mapId, npcs, monsters, sources };
}

// Backwards-compatible aliases
export function bianjingMapDefinition(store: JxShareAssetStore) {
  return getMapDefinition(store, 37);
}

export function bianjingRegion(store: JxShareAssetStore, mapId: number, x: number, y: number): RegionMapData {
  return getMapRegion(store, mapId, x, y);
}
