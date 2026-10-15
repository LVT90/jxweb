# BÁO CÁO KHẢO SÁT NGUỒN TÀI NGUYÊN JX PC (SOURCE AUDIT)

## 1. TỔNG QUAN TÀI NGUYÊN GỐC
- **Nguồn Client JX PC**: `D:\võ khánh\Client_VLTK_SHXT`
  - Thư mục chứa 29 tệp kho lưu trữ Kingsoft `.pak` tại `data/`.
  - Cấu hình nạp gói: `package.ini` chỉ định thứ tự ưu tiên 29 file PAK.
  - Tọa độ NPC và thành thị: `VLAuto/Maps/CityMaps/City<ID>.map`.
- **Nguồn Cấu hình & Dữ liệu Server**: `D:\File\ServerNew\_bin_v2_\gs\Settings`
  - Danh bạ bản đồ: `MapList.ini` định nghĩa 993 bản đồ kiếm hiệp (Thành thị, Thôn trấn, Môn phái, Mê cung Động phủ, Chiến trường Tống Kim).
  - Cấu hình NPC & Quái vật: `Npcs.txt` (2,176 mục định nghĩa tên, hệ ngũ hành, chỉ số sinh lực, sát thương, tốc độ, mã tài nguyên `NpcResType` / `enemyCode`).
- **Nguồn Client Mobile/Tham khảo**: `D:\File\Client\Resources`
  - Tệp bản đồ di động `maps/CityMaps`.

---

## 2. KẾT QUẢ KHẢO SÁT ĐỊNH DẠNG TÀI NGUYÊN

### 2.1. Cấu trúc Kingsoft PAK Archive
- Header 32 bytes: Mã định danh `PACK` hoặc biến thể Kingsoft, cờ nén, vị trí bảng chỉ mục.
- Thuật toán giải nén: **NRV2b (UCL Bitstream Compression)** được giải mã on-the-fly qua bitstream decompressor tùy biến trong `jx-assets.ts`.
- Bảng chỉ mục: 16 bytes mỗi mục (Mã băm CRC/Hash, Offset trong file PAK, Kích thước nén, Kích thước thực).
- 29 file PAK gồm:
  - `maps.pak`: Toàn bộ địa hình, gạch nền (.spr), nhà cửa, cây cối, cầu cống, vách đá, cấu hình thế giới `.wor` và dữ liệu vùng `Region_C.dat`.
  - `npclist.pak`: Hoạt ảnh nhân vật (Nam, Nữ), NPC thường dân (passerby), quái vật (enemy), trùm (boss).
  - `spr.pak`: Hiệu ứng kỹ năng, ánh sáng ngũ hành, vật phẩm rớt, giao diện cổ điển.
  - `ui.pak`: Khung hình giao diện người dùng, biểu tượng trang bị, mini-map, avatar môn phái.
  - `skills.pak`, `sound.pak`, `font.pak`, v.v.

### 2.2. Cấu trúc Sprite Kingsoft (.spr)
- Header 32 bytes: Mã `SP` / `SPRITE`, số hướng chuyển động `Directions` (thường là 8 hướng isometric), tổng số khung hình `FramesPerDirection`, chu kỳ hiển thị.
- Mỗi khung hình: Header 8 bytes gồm chiều rộng `Width`, chiều cao `Height`, tọa độ neo trọng tâm `OffsetX`, `OffsetY`.
- Điểm neo chuẩn võ lâm: Tâm góc nhìn đặt tại (160, 160). Khi dựng hình trên Canvas tại tọa độ màn hình `(screenX, screenY)`, công thức căn chỉnh bàn chân nhân vật chuẩn xác trên mặt đất là:
  $$\text{DrawX} = \text{screenX} + (\text{offsetX} - 160) \times \text{scale}$$
  $$\text{DrawY} = \text{screenY} + (\text{offsetY} - 180) \times \text{scale}$$

### 2.3. Cấu trúc Bản đồ Thế giới (.wor & Region_C.dat)
- File cấu hình thế giới `.wor`: Lưu trữ giới hạn tọa độ `rect = left, top, right, bottom` (tính theo đơn vị Region, mỗi Region = $512 \times 512$ pixels).
- Tệp dữ liệu vùng `Region_C.dat`:
  - Section 4: Lớp mặt đất `Ground.dat` gồm 64 ô gạch isometric ($8 \times 8$ gạch $64 \times 64$ pixels) và các chi tiết phủ mặt đất.
  - Section 5: Lớp kiến trúc và cảnh quan `BuildinObj.Dat` (cây xanh, nhà cửa, tường thành, bờ rào, cổng thành) với thông số chiều sâu `sort` để render trùng khớp trục Z.

---

## 3. NGUYÊN TẮC BẢO VỆ DỮ LIỆU ĐÃ ÁP DỤNG
- 100% tài nguyên gốc tại `D:\võ khánh\Client_VLTK_SHXT` và `D:\File` được truy cập ở chế độ **Read-Only**.
- Không sao chép thừa thãi tệp dung lượng lớn làm đầy ổ đĩa; toàn bộ việc trích xuất và giải nén SPR/Region được thực hiện trực tiếp trên RAM theo nhu cầu (On-Demand Streaming).
- Tuyệt đối không can thiệp hoặc tái sử dụng mã nguồn dự án web cũ. Toàn bộ mã nguồn webgame mới được phát triển từ số 0 tại `D:\jx-web mới`.
