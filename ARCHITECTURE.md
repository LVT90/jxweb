# KIẾN TRÚC HỆ THỐNG WEBGAME JX (ARCHITECTURE)

## 1. MÔ HÌNH KIẾN TRÚC TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────┐
│                       HTML5 FRONTEND                        │
│   (HTML5 Canvas 2D + ES Modules + Responsive CSS HUD)      │
│                                                             │
│   ├── Engine Core:                                          │
│   │   ├── Camera.js (Follow, frustum & smooth lerp)         │
│   │   ├── Input.js (Mouse, Keyboard, Touch Joystick)        │
│   │   ├── Audio.js (Sound effects & Web Audio API)          │
│   │   └── SpriteManager.js (Real-time SPR texture cache)    │
│   │                                                         │
│   ├── Game Systems:                                         │
│   │   ├── Map.js (Kingsoft Region stream, Ground & Builtin) │
│   │   ├── Entities.js (Player, Remote, NPCs, Monsters, Boss)│
│   │   ├── Combat.js (5 Elements calculation, Skills, FX)    │
│   │   ├── Inventory.js (60-slot bag, equipment, enhance)    │
│   │   ├── Quest.js (Dã Tẩu quest chain, auto pathfinder)    │
│   │   └── Network.js (WebSocket sync, move, chat, combat)   │
│   │                                                         │
│   └── UI Interface:                                         │
│       ├── UI.js (HUD, Modals, World Map, Dialogs, Hotbar)   │
│       └── CSS (Võ Lâm Chi Mộng theme, gold borders, dark bg)│
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP & WebSocket (Port 2567)
┌───────────────────────────────▼─────────────────────────────┐
│                    NODE.JS BACKEND DAEMON                   │
│                                                             │
│   ├── REST API Endpoints:                                   │
│   │   ├── GET /api/health                                   │
│   │   ├── GET /api/jx/maps (Catalog 29 maps)                │
│   │   ├── GET /api/jx/map/:id (Rect, spawn, bounds)         │
│   │   ├── GET /api/jx/map/:id/region (Tiles & Builtins)     │
│   │   ├── GET /api/jx/map/:id/entities (NPCs & Monsters)    │
│   │   └── GET /api/jx/sprite.png (On-demand SPR decoder)    │
│   │                                                         │
│   ├── WebSocket Engine:                                     │
│   │   ├── Connection Handshake & Player ID dispatch         │
│   │   ├── Real-time Position & Direction Broadcast          │
│   │   └── Chat Channel Relay (World, Sect, Nearby)          │
│   │                                                         │
│   └── Asset Pipeline Core:                                  │
│       ├── jx-assets.ts (29 PAK indexer, NRV2b, SPR decoder) │
│       ├── jx-map.ts (Universal .wor & Region_C.dat parser)  │
│       └── jx-city-map.ts (City<ID>.map coordinate parser)   │
└───────────────────────────────┬─────────────────────────────┘
                                │ Read-Only File I/O
┌───────────────────────────────▼─────────────────────────────┐
│                  ORIGINAL JX PC ASSET STORAGE               │
│   ├── Client PAKs: D:\võ khánh\Client_VLTK_SHXT\data        │
│   ├── City Coordinates: D:\võ khánh\Client_VLTK_SHXT\VLAuto │
│   └── Server Settings: D:\File\ServerNew\_bin_v2_\gs        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. NGUYÊN TẮC THIẾT KẾ
1. **Không can thiệp file nguồn**: Toàn bộ dữ liệu JX PC được đọc dưới chế độ chỉ đọc.
2. **On-Demand Streaming**: Giải nén ảnh và gạch nền trực tiếp khi client cần thay vì chuyển đổi hàng nghìn file trước, giúp tiết kiệm dung lượng đĩa và khởi động tức thì.
3. **Responsive Đa Nền Tảng**: Một codebase duy nhất phục vụ PC Desktop (chuột, bàn phím) và Mobile (cảm ứng, joystick).
