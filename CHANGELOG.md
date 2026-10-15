# NHẬT KÝ THAY ĐỔI (CHANGELOG)

## [Phiên bản 0.3.0] - 09/10/2026
### Đã Thêm (Added)
- **Universal JX PC Map Engine (`server/src/jx-map.ts`)**:
  - Hỗ trợ toàn bộ 29 bản đồ cốt lõi từ `maps.pak`: 7 Đại Thành Thị (Biện Kinh, Lâm An, Phượng Tường, Thành Đô, Tương Dương, Dương Châu, Đại Lý), 9 Tân Thủ Thôn (Ba Lăng Huyện, Giang Tân Thôn, Nam Nhạc, Vĩnh Lạc, Chu Tiên, Đạo Hương, Long Môn, Thạch Cổ, Long Tuyền), Thập Đại Môn Phái (Thiếu Lâm, Đường Môn, Nga My, Võ Đang, Cái Bang, Côn Lôn, Thiên Nhẫn), và 6 Động Phủ Mê Cung (Thiết Tháp, Kim Quang Động, Kinh Hoàng Động, Bạch Vân Động, Lăng Tần Thủy Hoàng, Lưu Tiên Động).
  - Endpoint `/api/jx/maps` trả về danh mục bản đồ đầy đủ.
  - Endpoint `/api/jx/map/:mapId` trả về thông tin giới hạn `rect`, kích thước và tọa độ sinh ra mặc định `defaultSpawn`.
  - Endpoint `/api/jx/map/:mapId/region?x=...&y=...` trả về dữ liệu gạch nền (`groundTiles`), chi tiết phủ (`groundObjects`) và công trình kiến trúc (`builtins`).
  - Endpoint `/api/jx/map/:mapId/entities` nạp danh sách NPC và quái vật chuẩn xác theo từng bản đồ.
- **Client Native Map Streamer (`client/js/game/Map.js`)**:
  - Loại bỏ hoàn toàn hình khối vẽ mẫu; thay thế bằng cơ chế stream gạch nền thật từ `maps.pak` (`草原_黄稀.spr`, v.v.) và công trình kiến trúc (nhà cửa, tường thành, cây cối, cầu cống).
  - Tích hợp hàm `loadMap(mapId)` và `isWalkable(x, y)` theo giới hạn bản đồ thực tế.
  - Vẽ Minimap theo tỷ lệ thực hiển thị vị trí người chơi và NPC/quái vật.
- **Dịch Trạm Xa Phu & Bản Đồ Thế Giới (`client/js/ui/UI.js`)**:
  - Menu Dịch Trạm Xa Phu cho phép truyền tống liên thành thị, môn phái và động phủ thời gian thực.
  - Cập nhật giao diện Bản Đồ Thế Giới với đầy đủ 29 bản đồ võ lâm.
- **Quái Vật & Trùm Động Phủ Thật (`client/js/game/Entities.js`)**:
  - Nạp quái vật và Boss theo mã tài nguyên gốc (`enemy003`, `enemy005`, `enemy015`, `enemy021`, `enemy026`, `boss001`).
  - Hỗ trợ hoạt ảnh Boss hoàng kim trong động phủ.
- **Kiểm Thử Mở Rộng (`server/test-e2e.mjs`)**:
  - Mở rộng bộ kiểm thử tự động từ 12 lên 17 kịch bản, kiểm tra tất cả các endpoint bản đồ mới, thôn trấn Ba Lăng Huyện, động phủ Thiết Tháp và stream gạch nền.

### Đã Sửa (Fixed)
- Sửa lỗi Camera bị kẹp chặt ở tọa độ cố định 3584 khiến người chơi tại Ba Lăng Huyện hoặc Biện Kinh bị rơi khỏi tầm nhìn camera (`client/js/engine/Camera.js`).
- Sửa lỗi Minimap click điều hướng bị lệch gốc tọa độ (`client/js/main.js`).
- Giải quyết hoàn toàn xung đột cổng `EADDRINUSE` khi khởi động tiến trình Node.js nền.
