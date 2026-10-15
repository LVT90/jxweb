// Mang truoc, cache du phong: luon lay ban moi khi co mang, choi offline khi mat mang
// QA-021: truoc day ten cache co dinh 'jxidle-v1' va khong precache -> co the phuc vu HTML cu tro toi JS moi.
const C = 'jxidle-v41';   // v30: optional 32x16 collision-cell overlay
const CORE = ['./index.html', './style.css', './ui/jx2.css', './js/jxshell.js', './manifest.json', './js/core.js', './js/main.js', './js/audio.js', './js/mapobs.js', './js/native-city-points.js', './js/native-town-catalog.js', './js/native-town-service-points.js', './js/native-town-collision.js', './js/native-field-collision.js', './js/native-town-npcs.js', './js/render.js', './img/npc/passerby040.png', './img/npc/passerby192.png', './img/npc/passerby007.png', './img/npc/passerby004.png', './img/npc/passerby178.png', './img/npc/passerby198.png', './img/npc/passerby174.png', './js/native-map-routes.js', './js/native-map-waypoints.js', './js/native-town-routes.js', './js/native-map-route-ui.js', './ref.js', './data.js', './world.js', './img/npc-native/jxpc/passerby198.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby040_3.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby192.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby004_1.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby067_4.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby036_1.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby064_2.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby253.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby092.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby094.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby102.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby178.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby182.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby007.png?v=jxpcnpc20261011', './img/npc-native/jxpc/passerby174.png?v=jxpcnpc20261011'];
self.addEventListener('install', e => e.waitUntil(
  caches.open(C).then(c => c.addAll(CORE)).catch(() => caches.open(C))
    .then(() => self.skipWaiting())
));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin || u.pathname.startsWith('/api/')) return;   // API online va tai nguyen ngoai: khong cache
  const layMang = () => fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(req, cp)); } return r; });
  if (req.mode === 'navigate') {                      // dieu huong: mang truoc, offline thi lay ban da luu
    e.respondWith(layMang().catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(layMang().catch(() => caches.match(req)));
});
