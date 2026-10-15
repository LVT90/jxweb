# KẾ HOẠCH CHUYỂN ĐỔI VÀ TỐI ƯU TÀI NGUYÊN (ASSET CONVERSION PLAN)

## 1. MỤC TIÊU & THÁCH THỨC
- **Mục tiêu**: Giữ trọn 100% hình ảnh nguyên bản, không dùng vector hoặc placeholder, không làm chậm trình duyệt, không gây giật lag trên thiết bị di động (Android / iPhone / iPad).
- **Thách thức**:
  - Tệp gốc định dạng nén nhị phân cổ điển (NRV2b / UCL) và Kingsoft SPR 8 hướng.
  - Tổng dung lượng client PC > 8 GB, không thể tải hàng loạt về trình duyệt.
  - Tọa độ hệ MPS cổ điển của Kingsoft khác biệt so với tọa độ màn hình web phẳng.

---

## 2. KIẾN TRÚC PIPELINE "ON-DEMAND STREAMING"

```
[29 File PAK gốc trên đĩa cứng PC (Read-Only)]
                       │
                       ▼
    [Node.js Backend Asset Pipeline (`jx-assets.ts`)]
      ├── 1. Giải mã Header & Bảng băm Entry PAK
      ├── 2. UCL/NRV2b Bitstream Decompressor trực tiếp trong RAM
      ├── 3. Kingsoft 32-bit SPR Frame Parser & Palette Mapper
      └── 4. Xuất ảnh động PNG Stream kèm HTTP Headers (Offset-X, Offset-Y, Directions)
                       │
                       ▼ HTTP GET /api/jx/sprite.png?path=...&frame=...
                       │ HTTP GET /api/jx/map/:mapId/region?x=...&y=...
                       ▼
       [Trình duyệt Web Client (`SpriteManager.js`)]
      ├── In-Memory LRU Texture Cache (Map key -> HTMLImageElement)
      ├── Tự động prefetch các khung hình hoạt ảnh lân cận
      └── Vẽ Canvas 2D / WebGL với neo tọa độ bàn chân chuẩn xác
```

---

## 3. CÁC QUY TẮC CHUYỂN ĐỔI CHUẨN XÁC

### 3.1. Chuyển đổi Khung hình SPR 8 hướng
- Công thức chọn khung hình theo hướng và thời gian:
  $$\text{GlobalFrame} = \text{DirIndex} \times \text{FramesPerDir} + (\lfloor \text{AnimTimer} \times \text{FPS} \rfloor \pmod{\text{FramesPerDir}})$$
- Khung hình được cache vĩnh viễn theo bộ khóa `${path}#${frame}` tại client sau lần nạp đầu tiên.

### 3.2. Chuyển đổi và Stream Bản đồ Vùng (Region Streaming)
- Mỗi bản đồ được chia thành lưới vùng $512 \times 512$ pixel.
- Client chỉ stream các vùng nằm trong khung nhìn camera cộng biên đệm 1 vùng xung quanh (Frustum Culling):
  $$\text{VisibleRegions} = [\text{MinRx} \dots \text{MaxRx}] \times [\text{MinRy} \dots \text{MaxRy}]$$
- Khi nhân vật di chuyển qua ranh giới vùng, hệ thống tự động tải ngầm các vùng mới, giải phóng vùng quá xa khỏi tầm nhìn.

### 3.3. Tối ưu Hiệu năng Thiết bị Di động (Mobile Optimization)
- Hạn chế số lượng draw call bằng cách bỏ qua các ô gạch hoàn toàn nằm ngoài màn hình.
- Giảm độ trễ mạng bằng bộ đệm LRU Cache 128 vùng tại server và cache blob URL tại client.

## 4. THỬ NGHIỆM NGUỒN PAK JXMOBILE
- Backend nhận manifest `data/paklist_vn.ini` hoặc `data/paklist.ini` khi không có `package.ini`; chỉ các mục `pak_N` trỏ tới `data/*.pak` mới được nạp. Tệp media rời trong manifest không được xem là PAK.
- Các PAK bị thiếu từ manifest mobile được liệt kê tại `/api/jx/health` trong `missingPacks`. Cần kiểm tra danh sách này trước khi đánh giá nguồn đã đầy đủ; tài nguyên nằm trong gói thiếu vẫn có thể trả về không tìm thấy.
- Manifest `[Package]` hiện có vẫn giữ hành vi nghiêm ngặt: thiếu một PAK được khai báo sẽ làm cấu hình nguồn thất bại.
- Gắn nguồn thử nghiệm bằng `JX_CLIENT_DIR` và `JX_PAK_DIR`; chỉ đọc gói gốc, không sửa hoặc sao chép chúng. Kiểm tra lần lượt `/api/jx/health`, `/api/jx/map/:mapId`, `/api/jx/map/:mapId/region`, rồi giải mã sprite thực tế trước khi đưa vào sử dụng.
