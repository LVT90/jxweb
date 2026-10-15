# AGENT.md — QUY TẮC & QUY TRÌNH PHÁT TRIỂN WEBGAME JX H5 (PORT TỪ JX PC)

Tài liệu này xác định các tiêu chuẩn kiến trúc, quy tắc viết mã, quy trình kiểm thử, quy trình tự phản biện (Grilling/Review) và quy định bảo vệ dữ liệu gốc cho toàn bộ dự án webgame JX H5 tại `web_port/`.

---

## 1. NGUYÊN TẮC BẢO VỆ DỮ LIỆU & BẢN QUYỀN NGUỒN
1. **Dữ liệu gốc bất khả xâm phạm:**
   - Tuyệt đối không xóa, sửa, ghi đè hoặc di chuyển bất kỳ tệp nào trong `D:\võ khánh\Client_VLTK_SHXT` và `D:\File`.
   - Toàn bộ việc đọc tệp từ 29 PAK (`data/*.pak`) và `settings/` đều ở chế độ **CHỈ ĐỌC (READ-ONLY)**.
2. **Không tái sử dụng mã nguồn idle cũ:**
   - Dự án `web_port/` được xây dựng mới hoàn toàn, tách biệt 100% khỏi bất kỳ mã nguồn web cũ nào.
3. **Trung thực về kỹ thuật:**
   - Không bịa đặt kết quả kiểm thử, không dựng demo giả.
   - Mọi tính năng công bố hoàn thành đều phải có kịch bản test kiểm chứng thực tế chạy qua.

---

## 2. KIẾN TRÚC & TIÊU CHUẨN MÃ NGUỒN
- **Frontend Client:**
  - Ngôn ngữ: JavaScript ES2022+ (Native ES Modules) kết hợp HTML5 Canvas 2.5D Isometric Renderer.
  - Tách biệt rõ ràng:
    - `src/engine/`: Core Game Loop, Camera 2.5D, Input Manager (PC & Mobile Virtual Joystick), Audio Synthesizer, Sprite Pipeline.
    - `src/game/`: Entity System (Player, RemotePlayer, Npc, Monster), Combat & Ngũ Hành, Map & Region Loader, Inventory & Equipment, Quest System, Economy & Drops.
    - `src/network/`: WebSocket Client đồng bộ nhiều người chơi theo thời gian thực.
    - `src/ui/`: UI Manager điều khiển HUD, Action Hotbar, Minimap, Chat, Modals (Nhân vật, Hành trang, Võ công, Bản đồ).
- **Backend & Asset Pipeline:**
  - Ngôn ngữ: Node.js + TypeScript.
  - Phục vụ HTTP Static Assets, REST APIs (danh sách môn phái, cấu hình NPC, bản đồ thành thị).
  - On-Demand Bitstream NRV2b Decompressor & SPR Decoder trích xuất trực tiếp khung hình SPR sang PNG theo yêu cầu kèm HTTP offset headers.
  - WebSocket Gateway đồng bộ vị trí, hướng, chiêu thức và chat thế giới.
- **Tiêu chuẩn Code:**
  - Modular, Loose Coupling: Mỗi module chỉ giải quyết một trách nhiệm duy nhất (Single Responsibility).
  - Không dùng biến toàn cục rải rác; các trạng thái game phải quản lý tập trung.
  - Hỗ trợ responsive tuyệt đối cho cả PC (chuột + phím WASD + hotkeys) và Mobile/Tablet (chạm vuốt + cần điều khiển ảo).

---

## 3. VÒNG LẶP PHÁT TRIỂN & TỰ PHẢN BIỆN BẮT BUỘC (GRILLING / REVIEW LOOP)
Mỗi tính năng, sửa lỗi hoặc tối ưu hóa đều phải trải qua vòng lặp 10 bước nghiêm ngặt:
1. **Xác định yêu cầu:** Tiêu chí nghiệm thu rõ ràng (Acceptance Criteria).
2. **Khảo sát dữ liệu nguồn:** Đối chiếu chính xác cấu hình JX PC (SPR, INI, TXT, MAP).
3. **Thiết kế giải pháp:** Nhỏ gọn, module hóa và có thể kiểm chứng.
4. **Viết mã (Implementation):** Lập trình sạch, đúng kiến trúc.
5. **Kiểm thử tự động:** Viết test hoặc chạy kịch bản kiểm thử hành vi thực tế.
6. **Vòng phản biện Grilling:**
   - Kiểm tra lỗi logic và trường hợp biên (edge cases).
   - Kiểm tra lỗ hổng bảo mật / chống gian lận (anti-cheat).
   - Kiểm tra trải nghiệm người dùng trên cả PC và Mobile.
   - So sánh độ tương đồng (Feature Parity) so với bản JX PC gốc.
   - Kiểm tra hiệu năng bộ nhớ, CPU và FPS rendering.
7. **Sửa chữa:** Xử lý triệt để các vấn đề hợp lý phát hiện từ Grilling.
8. **Kiểm thử hồi quy (Regression Test):** Đảm bảo không làm hỏng tính năng đã chạy.
9. **Cập nhật tài liệu:** Ghi nhận vào `ROADMAP.md`, `TODO.md`, `PROJECT_STATUS.md`, `TEST_REPORT.md`, `docs/FEATURE_PARITY.md`.
10. **Chuyển giao:** Chỉ sau khi hoàn tất mới chuyển sang hạng mục tiếp theo.

---

## 4. QUY TRÌNH KHÔI PHỤC KHI BỊ NGẮT PHIÊN LÀM VIỆC
Khi phiên làm việc của Agent bị ngắt quãng hoặc khởi động lại:
1. Đọc ngay `PROJECT_STATUS.md` và `TODO.md` để nắm trạng thái hiện tại.
2. Đọc `docs/FEATURE_PARITY.md` và `docs/ASSET_INVENTORY.md` để biết tài nguyên nào đã nạp và tài nguyên nào đang bị chặn.
3. Chạy lại bài kiểm thử gần nhất (`node server/test-e2e.mjs`) để kiểm tra tính toàn vẹn hệ thống.
4. Tiếp tục thực hiện nhiệm vụ ưu tiên tiếp theo mà không làm lại từ đầu.

---

## 5. DANH MỤC VẤN ĐỀ CẦN GIẢI QUYẾT (KNOWN ISSUES & GAPS)
- [ ] Render bản đồ: Cần thay thế nền kẻ ô tạm thời bằng các lát gạch (Ground Tiles) và vật thể (Builtin Objects: cây cối, nhà cửa) JX PC thực tế trích xuất từ `maps.pak`.
- [ ] Animation nhân vật: Hoạt ảnh nhân vật và quái vật cần nạp đầy đủ các frame SPR gốc của VLTK 1 (đứng, chạy, đánh, bị thương, chết).
- [ ] Tọa độ thực thể: Nạp vị trí NPC và quái vật theo đúng tọa độ gốc từ các tệp `City<ID>.map` và `settings/maps/`.
