import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AssetDataError, JxShareAssetStore, normalizeAssetPath } from './jx-assets.js';

type NpcAction = {
  name: string;
  file: string;
};

type NpcDefinition = {
  id: string;
  kind: string;
  resourcePath: string;
  actions: NpcAction[];
};

type NpcTables = {
  definitions: Map<string, NpcDefinition>;
};

const npcTableCache = new Map<string, NpcTables>();

function tableRows(filePath: string): { header: string[]; rows: string[][] } {
  const contents = readFileSync(filePath).toString('latin1').replace(/^\uFEFF/, '');
  const lines = contents.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { header: [], rows: [] };

  const split = (line: string) => line.includes('\t')
    ? line.split('\t').map(value => value.trim())
    : line.trim().split(/\s+/);
  return { header: split(lines[0]), rows: lines.slice(1).map(split) };
}

function findNpcTable(settingsDirectory: string): NpcTables {
  const root = resolve(settingsDirectory);
  const cached = npcTableCache.get(root);
  if (cached) return cached;
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    throw new AssetDataError('The selected NPC settings folder is unavailable.', 503);
  }

  const files = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.txt$/i.test(entry.name))
    .map(entry => join(root, entry.name));

  let actionsFile: string | undefined;
  let kindFile: string | undefined;
  for (const file of files) {
    const firstLine = readFileSync(file).toString('latin1', 0, 4096).split(/\r?\n/, 1)[0].toLowerCase();
    if (firstLine.includes('npclist') && firstLine.includes('fightstand') && firstLine.includes('attack1')) {
      const rows = tableRows(file);
      if (rows.header.some(cell => cell.toLowerCase() === 'normalstand1') &&
          rows.rows.some(row => row.some(cell => /\.spr$/i.test(cell)))) {
        actionsFile = file;
      }
    }
    if (!kindFile && /normalnpc/i.test(readFileSync(file).toString('latin1'))) kindFile = file;
  }
  if (!actionsFile || !kindFile) {
    throw new AssetDataError('The selected NPC settings do not contain the expected NPC action and resource tables.', 503);
  }

  const actionsTable = tableRows(actionsFile);
  const kindTable = tableRows(kindFile);
  const actionNameIndex = actionsTable.header.findIndex(value => value.toLowerCase() === 'npclist');
  if (actionNameIndex < 0) {
    throw new AssetDataError('The NPC action table has no NpcList column.', 503);
  }

  const resourceByNpc = new Map<string, { kind: string; path: string }>();
  for (const row of kindTable.rows) {
    const id = row[0]?.trim();
    if (!id) continue;
    const kind = row[1]?.trim() || '';
    const resourcePath = row.find(value => /^spr[\\/]+npcres[\\/]+/i.test(value.trim()))?.trim();
    if (resourcePath) resourceByNpc.set(id.toLowerCase(), { kind, path: resourcePath });
  }

  const definitions = new Map<string, NpcDefinition>();
  for (const row of actionsTable.rows) {
    const id = row[actionNameIndex]?.trim();
    const resource = id && resourceByNpc.get(id.toLowerCase());
    if (!id || !resource) continue;
    const actions = actionsTable.header.flatMap((name, index) => {
      if (index === actionNameIndex) return [];
      const file = row[index]?.trim();
      return file && /\.spr$/i.test(file) ? [{ name, file }] : [];
    });
    definitions.set(id.toLowerCase(), { id, kind: resource.kind, resourcePath: resource.path, actions });
  }
  const result = { definitions };
  npcTableCache.set(root, result);
  return result;
}

export function npcResourceDetails(settingsDirectory: string, assets: JxShareAssetStore, npcId: string) {
  if (!/^[a-z0-9_-]{1,80}$/i.test(npcId)) {
    throw new AssetDataError('Invalid NPC id.');
  }
  const { definitions } = findNpcTable(settingsDirectory);
  const definition = definitions.get(npcId.toLowerCase());
  if (!definition) {
    throw new AssetDataError(`NPC resource was not found: ${npcId}`, 404);
  }

  const actions = definition.actions.map(action => {
    const path = normalizeAssetPath(`${definition.resourcePath}\\${action.file}`);
    try {
      const result = assets.getSprite(path, 0);
      return {
        ...action,
        path,
        available: true,
        sprite: {
          width: result.sprite.width,
          height: result.sprite.height,
          centerX: result.sprite.centerX,
          centerY: result.sprite.centerY,
          directions: result.sprite.directions,
          interval: result.sprite.interval,
          frameCount: result.sprite.frameCount,
          firstFrame: {
            width: result.frame.width,
            height: result.frame.height,
            offsetX: result.frame.offsetX,
            offsetY: result.frame.offsetY
          }
        }
      };
    } catch (error) {
      if (error instanceof AssetDataError && error.statusCode === 404) {
        return { ...action, path, available: false };
      }
      throw error;
    }
  });

  return { id: definition.id, kind: definition.kind, resourcePath: definition.resourcePath, actions };
}
