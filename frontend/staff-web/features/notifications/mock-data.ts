import type { Notification } from "@/lib/api/types";

// Dữ liệu mô phỏng theo UI demo (SW-13): thông báo phân công và hủy lịch gửi cho nhân viên spa.
// `message` đúng như API trả (≤ 500 ký tự); dòng đậm của thông báo dựng từ `type` và `appointmentId`.
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    notificationId: "f1000000-0000-4000-8000-000000000001",
    type: "ConfirmedAssigned",
    appointmentId: "1041a0b2-0000-4000-8000-000000000001",
    message: "Xíu, chó Chihuahua. Thứ tư 07/10, 09:00 – 10:20. Tắm & sấy lông, Vệ sinh tai & cắt móng.",
    isRead: false,
    createdAt: "2026-10-06T08:12:00+07:00",
  },
  {
    notificationId: "f1000000-0000-4000-8000-000000000002",
    type: "ConfirmedAssigned",
    appointmentId: "1030c4d5-0000-4000-8000-000000000002",
    message: "Mít, chó Phốc sóc. Thứ ba 06/10, 12:00 – 13:00. Tắm & sấy lông.",
    isRead: true,
    createdAt: "2026-10-04T17:05:00+07:00",
  },
  {
    notificationId: "f1000000-0000-4000-8000-000000000003",
    type: "ConfirmedAssigned",
    appointmentId: "1029e6f7-0000-4000-8000-000000000003",
    message: "Bông, chó Poodle. Thứ ba 06/10, 09:00 – 11:00. Tắm & sấy lông, Cắt tỉa lông.",
    isRead: true,
    createdAt: "2026-10-04T08:30:00+07:00",
  },
  {
    notificationId: "f1000000-0000-4000-8000-000000000004",
    type: "Cancelled",
    appointmentId: "09958a9b-0000-4000-8000-000000000004",
    message: "Pudding, mèo Ragdoll, 05/10 16:00. Lý do: vắng mặt quá 15 phút sau giờ hẹn.",
    isRead: true,
    createdAt: "2026-10-05T16:15:00+07:00",
  },
];
