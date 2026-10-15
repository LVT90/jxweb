# BẢNG ĐỐI CHIẾU TÍNH NĂNG (FEATURE PARITY)

## 1. SO SÁNH GIỮA JX PC VÀ BẢN WEB PORT H5

| Hệ Thống / Tính Năng | JX PC Gốc (VLTK 1) | JX Web Port H5 Mới | Mức Độ Hoàn Thiện |
|---|---|---|---|
| **Đồ Họa & Hoạt Ảnh** | Sprite Kingsoft .spr 8 hướng | Trích xuất trực tiếp từ PAK gốc qua Canvas 2.5D | 100% Nguyên bản |
| **Bản Đồ Địa Hình** | Đô thành, thôn trấn, phái, động, ải | 29 bản đồ stream trực tiếp từ `maps.pak` | Đầy đủ 29 bản đồ cốt lõi |
| **Điều Khiển PC** | Chuột trái di chuyển, bàn phím kỹ năng | Chuột trái di chuyển, phím 1-4, Q/W bơm máu | Đầy đủ phím tắt |
| **Điều Khiển Mobile** | Không hỗ trợ bản web | Cảm ứng đa điểm, Virtual Joystick, nút chạm | 100% Đáp ứng responsive |
| **Hệ Thống Ngũ Hành** | Kim - Mộc - Thủy - Hỏa - Thổ | Khắc hệ tính theo chuẩn (tăng 30% / giảm 20%) | Hoàn chỉnh |
| **Thập Đại Môn Phái** | Thiếu Lâm, Thiên Vương, Đường Môn, Ngũ Độc, Nga My, Thúy Yên, Cái Bang, Thiên Nhẫn, Võ Đang, Côn Lôn | 10 môn phái đầy đủ màu sắc, chiêu thức, icon | Hoàn chỉnh |
| **Dịch Trạm Xa Phu** | Truyền tống liên thành thị, thôn trấn | Menu truyền tống 29 bản đồ thời gian thực | Hoàn chỉnh |
| **Chuỗi Nhiệm Vụ Dã Tẩu** | Đối thoại Dã Tẩu nhận thưởng | Tích hợp hệ thống nhiệm vụ & auto đường đi | Hoàn chỉnh |
| **Chiến Đấu & Quái Vật** | Đánh quái dã ngoại, hồi sinh, rơi đồ | AI rượt đuổi, đánh, nhận sát thương, rớt đồ | Hoàn chỉnh |
| **Động Phủ & Phụ Bản Ải** | Mê cung Thiết Tháp, Kim Quang Động, Tần Lăng | Thử thách phụ bản, quái tinh anh & Boss hoàng kim | Hoàn chỉnh |
| **Multiplayer / Mạng** | Client-Server C++ độc quyền | WebSocket Broadcast thời gian thực (Node.js) | Sẵn sàng đa người chơi |
| **Túi Đồ & Trang Bị** | Túi đồ 60 ô, cường hóa huyền tinh | Túi đồ lưới 60 ô, trang bị 6 vị trí, ép sao | Hoàn chỉnh |
| **Minimap & Radar** | Bản đồ thu nhỏ góc trên màn hình | Minimap Canvas tỷ lệ thực, bấm click để đi tới | Hoàn chỉnh |

---

## 2. KẾ HOẠCH NÂNG CẤP TIẾP THEO
1. Thêm hệ thống Lập Tổ Đội (Party / Team System) qua WebSocket.
2. Thêm tính năng Giao Dịch trực tiếp giữa hai người chơi.
3. Tích hợp âm thanh nhạc nền MP3/WAV gốc từ `sound.pak` cho từng bản đồ riêng biệt.
