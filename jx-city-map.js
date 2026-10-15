"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cityNpcPoints = cityNpcPoints;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const jx_assets_js_1 = require("./jx-assets.js");
const CITY_NPC_POINTS = [
    { id: 'repository', name: 'Rương chứa đồ' },
    { id: 'driver-1', name: 'Xa phu 1' },
    { id: 'driver-2', name: 'Xa phu 2' },
    { id: 'driver-3', name: 'Xa phu 3' },
    { id: 'driver-4', name: 'Xa phu 4' },
    { id: 'groceries', name: 'Tạp hóa' },
    { id: 'pharmacy', name: 'Hiệu thuốc' },
    { id: 'reputation', name: 'Võ lâm truyền nhân' },
    { id: 'blacksmith', name: 'Thợ rèn' },
    { id: 'postman', name: 'Dịch quan' },
    { id: 'yeshou', name: 'Dã Tẩu' },
    { id: 'horseman', name: 'Người bán ngựa' }
];
function readCityPointSource(cityMapsDirectory, mapId, source) {
    const root = (0, node_path_1.resolve)(cityMapsDirectory);
    if (!(0, node_fs_1.existsSync)(root) || !(0, node_fs_1.statSync)(root).isDirectory()) {
        throw new jx_assets_js_1.AssetDataError(`${source} city-map folder is unavailable.`, 503);
    }
    const filePath = (0, node_path_1.resolve)(root, `City${mapId}.map`);
    if (!filePath.startsWith(`${root}${node_path_1.sep}`)) {
        throw new jx_assets_js_1.AssetDataError('Invalid city map path.');
    }
    if (!(0, node_fs_1.existsSync)(filePath))
        return undefined;
    const size = (0, node_fs_1.statSync)(filePath).size;
    if (size === 0 || size > 256 * 1024) {
        throw new jx_assets_js_1.AssetDataError(`${source} city map ${mapId} has an unsupported size.`, 422);
    }
    const rows = (0, node_fs_1.readFileSync)(filePath, 'utf8')
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    if (rows.length < 15) {
        throw new jx_assets_js_1.AssetDataError(`${source} city map ${mapId} has an incomplete NPC point section.`, 422);
    }
    const points = CITY_NPC_POINTS.map((point, index) => {
        const match = /^(-?\d+)\s*,\s*(-?\d+)$/.exec(rows[index]);
        if (!match) {
            throw new jx_assets_js_1.AssetDataError(`${source} city map ${mapId} has an invalid NPC point at index ${index}.`, 422);
        }
        const x = Number(match[1]);
        const y = Number(match[2]);
        return { index, x, y, available: x !== 0 || y !== 0 };
    });
    return { source: `${source}/City${mapId}.map`, points };
}
function cityNpcPoints(pcCityMapsDirectory, mobileCityMapsDirectory, mapId) {
    if (!Number.isSafeInteger(mapId) || mapId < 1 || mapId > 9999) {
        throw new jx_assets_js_1.AssetDataError('Invalid city map id.');
    }
    const pc = readCityPointSource(pcCityMapsDirectory, mapId, 'VLAuto/Maps/CityMaps');
    const mobile = readCityPointSource(mobileCityMapsDirectory, mapId, 'Resources/maps/CityMaps');
    if (!pc && !mobile) {
        throw new jx_assets_js_1.AssetDataError(`Native PC and mobile city map data was not found for map ${mapId}.`, 404);
    }
    const points = CITY_NPC_POINTS.map((point, index) => {
        const pcPoint = pc?.points[index];
        const mobilePoint = mobile?.points[index];
        const pcAvailable = pcPoint?.available || false;
        const mobileAvailable = mobilePoint?.available || false;
        const matches = pcAvailable && mobileAvailable && pcPoint && mobilePoint
            ? pcPoint.x === mobilePoint.x && pcPoint.y === mobilePoint.y
            : null;
        return {
            ...point,
            index,
            x: mobilePoint?.x ?? pcPoint?.x ?? 0,
            y: mobilePoint?.y ?? pcPoint?.y ?? 0,
            available: pcAvailable || mobileAvailable,
            pc: { x: pcPoint?.x ?? 0, y: pcPoint?.y ?? 0, available: pcAvailable },
            mobile: { x: mobilePoint?.x ?? 0, y: mobilePoint?.y ?? 0, available: mobileAvailable },
            matches
        };
    });
    return {
        mapId,
        source: {
            pc: pc?.source ?? null,
            mobile: mobile?.source ?? null
        },
        coordinateType: 'native NPC auto-navigation target coordinates; not screen pixels or guaranteed NPC spawn positions',
        points
    };
}
