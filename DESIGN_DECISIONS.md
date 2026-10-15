# QUYẾT ĐỊNH THIẾT KẾ KỸ THUẬT (DESIGN DECISIONS)

## 1. QUYẾT ĐỊNH VỀ PIPELINE TÀI NGUYÊN (ASSET PIPELINE)
- **Vấn đề**: Bản client JX PC có hơn 8 GB tài nguyên với định dạng nén độc quyền Kingsoft PAK và Kingsoft SPR 8 hướng. Nếu giải nén hàng loạt sẽ tốn chục GB đĩa và hàng giờ đồng hồ.
- **Quyết định**: Xây dựng bộ giải nén trực tiếp trong Node.js (`jx-assets.ts`). Mỗi khi client cần ảnh hoặc gạch nền, gửi yêu cầu `/api/jx/sprite.png?path=...&frame=...`, server giải nén NRV2b trong bộ nhớ RAM và trả về ảnh PNG có đính kèm các HTTP header `X-Frame-Offset-X`, `X-Frame-Offset-Y`, `X-Sprite-Directions`.
- **Lợi ích**: Tốc độ phản hồi cực nhanh, không tốn thêm dung lượng đĩa, an toàn tuyệt đối cho tệp gốc.

---

## 2. QUYẾT ĐỊNH VỀ TỌA ĐỘ VÀ ANCHORING (COORDINATE SYSTEM)
- **Vấn đề**: Trong game JX PC gốc, tọa độ MPS trục Y bằng $2 \times$ tọa độ màn hình. Thêm vào đó, điểm neo của nhân vật trong file SPR đặt tại (160, 160).
- **Quyết định**: Chuẩn hóa toàn bộ tọa độ trên Canvas:
  - Tọa độ thế giới $X, Y$ tính theo pixel màn hình ($Y = \text{MPS } Y / 2$).
  - Khi render SPR, vẽ tại `screenX + (offsetX - 160)` và `screenY + (offsetY - 180)` để bàn chân nhân vật tiếp đất đúng tâm ô gạch isometric.
- **Lợi ích**: Bước đi mượt mà, không bị hiện tượng "lơ lửng trên không" hoặc "chìm dưới đất".

---

## 3. QUYẾT ĐỊNH VỀ STREAMING BẢN ĐỒ VÙNG (MAP REGION STREAMING)
- **Vấn đề**: Các đại đô thành như Biện Kinh, Lâm An có diện tích hàng chục nghìn pixel vuông, chứa hàng nghìn ô gạch nền và cây cối.
- **Quyết định**: Chia bản đồ theo các Region kích thước $512 \times 512$ pixel. Client chỉ tải các Region nằm trong khung nhìn camera (cộng biên an toàn 1 vùng). Khi nhân vật di chuyển, các vùng mới được prefetch ngầm và các vùng xa được giải phóng.
- **Lợi ích**: Tốc độ khung hình duy trì ổn định 60 FPS cả trên máy tính và điện thoại cấu hình yếu.

---

## 4. QUYẾT ĐỊNH VỀ HỆ THỐNG GIAO DIỆN (UI DESIGN)
- **Vấn đề**: Người chơi yêu cầu phong cách hoài niệm JX PC nhưng bố cục hiện đại, dễ thao tác như Võ Lâm Chi Mộng.
- **Quyết định**: Dựng HUD bằng HTML5/CSS với màu sắc trầm mặc cổ điển (viền vàng kim, nền đá đen, thanh máu đỏ, nội lực xanh, kinh nghiệm vàng). Trên PC có đầy đủ phím tắt 1-4, Q, W, E, R; trên điện thoại tự động hiển thị Joystick cảm ứng và phím kỹ năng bán kính ngón tay.
- **Lợi ích**: Đem lại cảm giác võ lâm chân thực nhất trên mọi thiết bị duyệt web.
