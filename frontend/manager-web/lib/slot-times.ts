// Mốc giờ đặt lịch mặc định của Booking.SlotTimes (openapi ConfigSettings, seed backend), dùng làm lựa chọn “Mốc bắt đầu muộn nhất”.
// API đọc cấu hình GET /config (FR-CFG-01) chưa có ở backend nên web chưa lấy được danh sách thật; backend vẫn kiểm tra
// mốc giờ theo cấu hình trong DB và trả 400 VALIDATION_ERROR nếu không thuộc danh sách. Thay bằng GET /config khi API sẵn sàng.
export const SLOT_TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
