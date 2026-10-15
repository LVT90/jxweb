/**
 * test-game-e2e.mjs - Automated End-to-End Test Suite for JX Webgame
 */

import { WebSocket } from 'ws';

async function runTests() {
  console.log('====================================================');
  console.log('    TEST SUITE: WEBGAME VÕ LÂM JX (E2E VERIFICATION)');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:2567';
  let passed = 0;
  let failed = 0;

  async function testHttp(name, path, expectedStatus, validator) {
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      if (res.status !== expectedStatus) {
        console.error(`❌ [FAIL] ${name}: Expected status ${expectedStatus}, got ${res.status}`);
        failed++;
        return;
      }
      const data = res.headers.get('content-type')?.includes('application/json')
        ? await res.json()
        : await res.text();

      if (validator && !validator(data, res)) {
        console.error(`❌ [FAIL] ${name}: Response validation failed`);
        failed++;
        return;
      }
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}: Request error: ${err.message}`);
      failed++;
    }
  }

  // 1. Static Web Client Tests
  await testHttp('Static Index Page (HTML5 Canvas UI)', '/', 200, (data) =>
    data.includes('id="gameCanvas"') && data.includes('Võ Lâm JX Web')
  );

  await testHttp('Static CSS Stylesheet', '/css/jx-ui.css', 200, (data) =>
    data.includes('joystick-container') && data.includes('player-hud')
  );

  await testHttp('Main JS Bootstrap Module', '/js/main.js', 200, (data) =>
    data.includes('JXGame') && data.includes('requestAnimationFrame')
  );

  await testHttp('Entities Module', '/js/game/Entities.js', 200, (data) =>
    data.includes('FACTION_CONFIG') && data.includes('class Player')
  );

  await testHttp('Combat & 5 Elements Module', '/js/game/Combat.js', 200, (data) =>
    data.includes('FIVE_ELEMENTS') && data.includes('calculateElementMultiplier')
  );

  await testHttp('Inventory & Enhancement Module', '/js/game/Inventory.js', 200, (data) =>
    data.includes('enhanceGear') && data.includes('capacity = 60')
  );

  await testHttp('Quest & Auto-Pathfinding Module', '/js/game/Quest.js', 200, (data) =>
    data.includes('QUEST_CHAIN') && data.includes('triggerAutoNav')
  );

  // 2. Backend API Tests
  await testHttp('API: System Health Endpoint', '/api/health', 200, (data) =>
    data.ok === true && data.port === 2567
  );

  await testHttp('API: Factions Endpoint', '/api/jx/factions', 200, (data) =>
    data.ok === true && Array.isArray(data.factions) && data.factions.length === 10
  );

  await testHttp('API: JX PAK Storage Health (29 Archives)', '/api/jx/health', 200, (data) =>
    data.ok === true && data.packCount === 29
  );

  await testHttp('API: Universal Maps Catalog (29 Canonical Maps)', '/api/jx/maps', 200, (data) =>
    data.ok === true && Array.isArray(data.maps) && data.maps.length >= 25
  );

  await testHttp('API: Map Biện Kinh (37) Data', '/api/jx/map/37', 200, (data) =>
    data.ok === true && data.mapId === 37 && data.name === 'Biện Kinh' && data.rect !== undefined
  );

  await testHttp('API: Novice Village Ba Lăng Huyện (53)', '/api/jx/map/53', 200, (data) =>
    data.ok === true && data.mapId === 53 && data.name === 'Ba Lăng Huyện' && data.rect !== undefined
  );

  await testHttp('API: Entities for Ba Lăng Huyện (NPCs & Monsters)', '/api/jx/map/53/entities', 200, (data) =>
    data.ok === true && Array.isArray(data.npcs) && data.npcs.length >= 4 && Array.isArray(data.monsters) && data.monsters.length >= 10
  );

  await testHttp('API: Cave / Dungeon Thiết Tháp (38)', '/api/jx/map/38', 200, (data) =>
    data.ok === true && data.mapId === 38 && data.name === 'Thiết Tháp Tầng 1' && data.type === 'cave'
  );

  await testHttp('API: Native Region Ground Tiles Streaming (Ba Lăng Huyện)', '/api/jx/map/53/region?x=98&y=98', 200, (data) =>
    data.ok === true && Array.isArray(data.groundTiles) && data.groundTiles.length > 0
  );

  // 3. WebSocket Multi-Client Real-Time Synchronization Test
  console.log('\n--- WebSocket Multi-Client Synchronization Test ---');
  await new Promise((resolve) => {
    let wsPassed = true;
    const ws1 = new WebSocket('ws://localhost:2567/');
    const ws2 = new WebSocket('ws://localhost:2567/');

    let ws1Id = null;
    let ws2Id = null;
    let ws2SawWs1Move = false;
    let ws2SawWs1Chat = false;

    ws1.on('open', () => {
      // Client 1 sends handshake
      ws1.send(JSON.stringify({
        type: 'player-update',
        name: 'Đại Hiệp Test 1',
        fac: 'shaolin',
        lvl: 50,
        x: 1800,
        y: 1800,
        act: 'run',
        dir: 2
      }));
    });

    ws1.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'welcome') {
        ws1Id = msg.playerId;
      }
    });

    ws2.on('open', () => {
      // Client 2 connects after Client 1
      ws2.send(JSON.stringify({
        type: 'player-update',
        name: 'Đại Hiệp Test 2',
        fac: 'wudang',
        lvl: 45,
        x: 1820,
        y: 1810,
        act: 'idle',
        dir: 0
      }));

      // Client 1 sends a chat message
      setTimeout(() => {
        ws1.send(JSON.stringify({
          type: 'chat',
          channel: 'world',
          text: 'Võ lâm chính phái tụ hội!'
        }));
      }, 100);
    });

    ws2.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'welcome') {
        ws2Id = msg.playerId;
      }
      if (msg.type === 'players') {
        const foundWs1 = msg.players.find(p => p.name === 'Đại Hiệp Test 1');
        if (foundWs1) ws2SawWs1Move = true;
      }
      if (msg.type === 'chat') {
        if (msg.text === 'Võ lâm chính phái tụ hội!') {
          ws2SawWs1Chat = true;
        }
      }
    });

    setTimeout(() => {
      ws1.close();
      ws2.close();

      if (ws1Id && ws2Id && ws2SawWs1Move && ws2SawWs1Chat) {
        console.log('✅ [PASS] WebSocket Real-Time Sync: Handshake, Movement Broadcast & Chat Relay verified.');
        passed++;
      } else {
        console.error('❌ [FAIL] WebSocket Real-Time Sync: Incomplete message reception', {
          ws1Id, ws2Id, ws2SawWs1Move, ws2SawWs1Chat
        });
        failed++;
      }
      resolve();
    }, 800);
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED.`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
