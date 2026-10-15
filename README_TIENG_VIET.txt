VÕ LÂM IDLE - BẢN OFFLINE DỰNG TỪ FRONTEND GỐC DO NGƯỜI DÙNG CUNG CẤP

KHÔNG sử dụng bất cứ thành phần nào của Giang Hồ Huyền Kiếm V31/V32.

CÁCH CHƠI TRÊN WINDOWS
1. Giải nén toàn bộ ZIP vào một thư mục. Không mở game khi vẫn nằm trong ZIP.
2. Nhấp đúp CHAY_GAME_OFFLINE.cmd (máy đã có Python sau lần thu thập trước).
3. Trình duyệt mở địa chỉ 127.0.0.1, hoàn toàn là trên máy của bạn, không kết nối server game.
4. Tạo nhân vật theo màn hình môn phái. Tiến trình lưu trong trình duyệt (localStorage).
5. Trước khi đổi trình duyệt/xóa bộ nhớ, hãy xuất file .jxsave trong Hệ thống.
6. Muốn kết thúc, đóng cửa sổ CMD hoặc nhấn Ctrl+C.

BẢN HTML 1 FILE
Mở file VoLamIdle_BAN_GOC_OFFLINE_1_FILE.html bằng Chrome/Edge. Đây là một lựa chọn tiện lợi,
nhưng việc ghi localStorage của file:// tùy theo chính sách trình duyệt. Nên dùng gói ZIP ở trên.

GIỚI HẠN CỦA BỘ TÀI NGUYÊN ĐÃ THU THẬP
- Hệ thống chiến đấu, võ công, trang bị, ngựa, dữ liệu game và lưu offline là mã frontend gốc.
- Mã backend đăng nhập, server, bảng xếp hạng, chợ, thư và chat không có trong bản thu thập.
  Bản offline tắt các dịch vụ đó, không phải bản sao online 100%.
- Những hình ảnh, icon và sprite chưa được thu thập có thể bị thiếu khi đổi bản đồ hoặc môn phái.
- Tệp ASSET_MANIFEST.json liệt kê các đường dẫn ảnh / nhạc còn thiếu đã xác định từ mã nguồn.
- Muốn lấy thêm tài nguyên (nếu có quyền được sử dụng), chạy BO_SUNG_TAI_NGUYEN.cmd
  trong khi máy có Internet; có thể rất lâu và không đảm bảo mọi URL còn hợp lệ.
- Sau khi bổ sung, chạy TAO_LAI_HTML_1_FILE.cmd để cập nhật HTML tự chứa tài nguyên mới.

BẢO MẬT: Không có URL, khóa Supabase hoặc dữ liệu mật khẩu trong cấu hình offline.
KHÔNG XÓA bộ nhớ website 127.0.0.1 khi chưa xuất bản lưu nhân vật.
