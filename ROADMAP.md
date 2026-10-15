# LỘ TRÌNH PHÁT TRIỂN DỰ ÁN WEBGAME JX (ROADMAP)

## GIAI ĐOẠN 1: KHẢO SÁT & XÂY DỰNG NỀN TẢNG (HOÀN THÀNH ✅)
- [x] Khảo sát toàn bộ kho lưu trữ 29 tệp `.pak` của JX PC tại `D:\võ khánh\Client_VLTK_SHXT\data`.
- [x] Khảo sát cấu hình server `MapList.ini`, `Npcs.txt` tại `D:\File\ServerNew\_bin_v2_\gs\Settings`.
- [x] Khảo sát tọa độ NPC thành thị `CityMaps` tại `VLAuto/Maps/CityMaps`.
- [x] Lập tài liệu bảo vệ dữ liệu gốc (Read-Only) và thiết lập quy chuẩn kỹ sư `AGENT.md`.
- [x] Hoàn thiện 6 tài liệu kỹ thuật tại `web_port/docs/`: `SOURCE_AUDIT.md`, `ASSET_INVENTORY.md`, `ASSET_CONVERSION_PLAN.md`, `FEATURE_PARITY.md`, `ARCHITECTURE.md`, `DESIGN_DECISIONS.md`.

## GIAI ĐOẠN 2: PIPELINE GIẢI NÃ TÀI NGUYÊN ON-DEMAND (HOÀN THÀNH ✅)
- [x] Viết bộ giải nén bitstream NRV2b / UCL trong bộ nhớ RAM (`jx-assets.ts`).
- [x] Viết bộ giải mã Kingsoft SPR 8 hướng xuất ảnh PNG kèm header tọa độ neo (`offsetX`, `offsetY`).
- [x] Viết bộ giải mã bản đồ thế giới `.wor` và dữ liệu vùng `Region_C.dat` (`jx-map.ts`).
- [x] Thiết lập cache LRU bộ nhớ cho các vùng bản đồ và texture khung hình.

## GIAI ĐOẠN 3: HỆ THỐNG ĐA BẢN ĐỒ & THÀNH THỊ JX PC (HOÀN THÀNH ✅)
- [x] Hỗ trợ toàn bộ 29 bản đồ cốt lõi:
  - **Thất Đại Thành Thị**: Biện Kinh, Lâm An, Phượng Tường, Thành Đô, Tương Dương, Dương Châu, Đại Lý.
  - **Tân Thủ Thôn Trấn**: Ba Lăng Huyện, Giang Tân Thôn, Nam Nhạc Trấn, Vĩnh Lạc Trấn, Chu Tiên Trấn, Đạo Hương Thôn, Long Môn Trấn, Thạch Cổ Trấn, Long Tuyền Thôn.
  - **Thập Đại Môn Phái**: Thiếu Lâm, Đường Môn, Nga My, Võ Đang, Cái Bang, Côn Lôn, Thiên Nhẫn.
  - **Mê Cung Động Phủ & Phụ Bản Ải**: Thiết Tháp, Kim Quang Động, Kinh Hoàng Động, Bạch Vân Động, Lăng Tần Thủy Hoàng, Lưu Tiên Động.
- [x] Hệ thống stream gạch nền thật từ `maps.pak` (`草原_黄稀.spr`, v.v.) và công trình kiến trúc (nhà cửa, cổng thành, cây cối, cầu cống).
- [x] Dịch trạm Xa Phu: Menu truyền tống liên thành thị, môn phái và động phủ thời gian thực.
- [x] Minimap tỷ lệ thực hiển thị địa hình và vị trí thực thể.

## GIAI ĐOẠN 4: THỰC THỂ & HỆ THỐNG CHIẾN ĐẤU NGŨ HÀNH (HOÀN THÀNH ✅)
- [x] Nhân vật người chơi: Sprite Kingsoft thật 8 hướng (Nam/Nữ, đi bộ, chạy, xuất chiêu, thi triển phép).
- [x] NPC tương tác thật: Xa Phu, Dã Tẩu, Chủ Dược Điếm, Thợ Rèn, Sứ Giả Môn Phái.
- [x] Quái vật & Boss thật: `enemy003` (Thổ Phỉ), `enemy005` (Lưu Manh), `enemy015` (Sơn Tặc), `enemy021` (Đao Khách), `enemy026` (Cung Binh), `boss001` (Trùm động phủ).
- [x] Hệ thống Ngũ Hành tương sinh tương khắc (Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim).
- [x] Túi đồ 60 ô, trang bị 6 vị trí, cường hóa huyền tinh tăng lực chiến.
- [x] Chuỗi nhiệm vụ Dã Tẩu và tự động tìm đường (Auto-Pathfinding).

## GIAI ĐOẠN 5: MULTIPLAYER & KIỂM THỬ TỰ ĐỘNG (HOÀN THÀNH ✅)
- [x] WebSocket Server port 2567 đồng bộ vị trí, hướng quay và trạng thái hành động người chơi.
- [x] Kênh chat đa kênh (Thế giới, Môn phái, Lân cận).
- [x] Bộ kiểm thử tự động E2E 17/17 kịch bản vượt qua 100% (`server/test-e2e.mjs`).

## GIAI ĐOẠN 6: NÂNG CẤP MỞ RỘNG (KẾ HOẠCH TIẾP THEO 🔄)
- [ ] Tính năng Lập Tổ Đội (Party) đi phụ bản động phủ.
- [ ] Tính năng Giao Dịch trực tiếp giữa người chơi.
- [ ] Âm thanh nền BGM từng bản đồ trích xuất từ `sound.pak`.
