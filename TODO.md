# DANH SÁCH NHIỆM VỤ (TODO)

## ĐÃ LƯU TIẾN ĐỘ HIỆN TẠI (SAVED CHECKPOINT) ✅
- [x] Khảo sát kho lưu trữ 29 file PAK JX PC và hệ thống cài đặt ServerNew (Read-Only).
- [x] Tạo `AGENT.md` trong `web_port/` quy định tiêu chuẩn kỹ sư và tự phản biện Grilling.
- [x] Hoàn thiện 6 tài liệu kiến trúc và khảo sát trong `web_port/docs/`:
  - `SOURCE_AUDIT.md`
  - `ASSET_INVENTORY.md`
  - `ASSET_CONVERSION_PLAN.md`
  - `FEATURE_PARITY.md`
  - `ARCHITECTURE.md`
  - `DESIGN_DECISIONS.md`
- [x] Viết bộ giải nén NRV2b / UCL và giải mã Kingsoft SPR 8 hướng on-demand trong RAM (`server/src/jx-assets.ts`).
- [x] Universal Map Engine (`server/src/jx-map.ts`) hỗ trợ 29 bản đồ:
  - 7 Đại Thành Thị (Biện Kinh, Lâm An, Phượng Tường, Thành Đô, Tương Dương, Dương Châu, Đại Lý).
  - 9 Tân Thủ Thôn Trấn (Ba Lăng Huyện, Giang Tân Thôn, Nam Nhạc, Vĩnh Lạc, Chu Tiên, Đạo Hương, Long Môn, Thạch Cổ, Long Tuyền).
  - Thập Đại Môn Phái (Thiếu Lâm, Đường Môn, Nga My, Võ Đang, Cái Bang, Côn Lôn, Thiên Nhẫn).
  - Động Phủ & Phụ Bản Ải (Thiết Tháp, Kim Quang Động, Kinh Hoàng Động, Bạch Vân Động, Lăng Tần Thủy Hoàng, Lưu Tiên Động).
- [x] Cải tiến Client `Map.js` stream gạch nền thật từ `maps.pak` (`草原_黄稀.spr`, v.v.) và công trình kiến trúc (nhà cửa, tường thành, cây cối, cầu cống).
- [x] Client `Entities.js` hỗ trợ quái vật thật (`enemy003`, `enemy005`, `enemy015`, `enemy021`, `enemy026`, `boss001`) và NPC thật.
- [x] Tích hợp Dịch trạm Xa Phu truyền tống liên thành thị, môn phái và động phủ thời gian thực.
- [x] **Khắc phục hình ảnh bị bể / lệch tỷ lệ (Aspect Ratio & Pixel Crispness)**:
  - Khám phá công thức chiếu isometric nguyên bản từ mã nguồn C++ Kingsoft (`GetLocalPositionByMps`): $S_y = \lfloor Y / 2 \rfloor - \text{CameraTop} - \lfloor \frac{Z \cdot 887}{1024} \rfloor$.
  - Tính toán chính xác tọa độ đỉnh $Y$ và chân đế $Y$ cho toàn bộ kiến trúc, nhà cửa, mái ngói, tường thành, cây cối, loại bỏ hoàn toàn hiện tượng lệch lún hoặc lơ lửng.
  - Khóa chế độ `imageSmoothingEnabled = false` trên từng khung hình Canvas 2D để triệt tiêu hiện tượng mờ / vỡ ảnh (bilinear blur / pixel tearing).
- [x] **Đưa toàn bộ quái vật ra khu vực ngoài thành / thôn (Outskirts Relocation & Safe Zone AI)**:
  - Di dời bãi quái ra ngoài 4 cổng thành (Đông, Tây, Nam, Bắc) cách trung tâm $\ge 1.450\text{px}$.
  - Giữ khu vực trung tâm thành thị và thôn xóm là Vùng An Toàn (Safe Zone) 100% bình yên.
  - Bổ sung AI Leash & Quay hướng 8 chiều: Quái không được vào thành thị, tự động rút về bãi quái hồi máu nếu người chơi chạy vào thành hoặc vượt quá cự ly truy đuổi 400px.
- [x] Viết và vượt qua 17/17 test kiểm thử tự động E2E (`node server/test-e2e.mjs`).

---

## TÁC VỤ TIẾP THEO THEO YÊU CẦU NGƯỜI DÙNG (PENDING FOR NEXT PHASE) 🔄
- [ ] **Đưa dữ liệu khớp 100% với các thôn từ JX PC qua web**:
  - Bóc tách đầy đủ danh sách NPC gốc và tọa độ chính xác từng mét của từng thôn từ `City53.map`, `City20.map`, `City54.map`, `City99.map`, `City100.map`, `City101.map`, `City121.map`, `City153.map`, `City174.map` và script `gs/script/maps/`.
  - Nạp đúng toàn bộ NPC chức năng: Thôn trưởng, Chủ dược điếm, Thợ rèn, Tạp hóa, Trưởng thôn, Người chỉ điểm, Võ sư sơ cấp.
  - Đưa bãi quái tân thủ ngoài cổng các thôn chuẩn theo JX PC (Heo rừng, Nhím, Hươu, Thỏ, Sói xám cấp 1-10) thay vì quái tổng quát.
  - Chuỗi nhiệm vụ tân thủ nhập môn theo từng thôn xóm.
- [ ] Tích hợp âm thanh nhạc nền BGM từng thôn/thành từ `sound.pak`.
- [ ] Tính năng Lập Tổ Đội (Party) và Giao Dịch giữa người chơi.
