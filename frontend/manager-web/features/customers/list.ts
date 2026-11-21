// MW-09 – Khách hàng bị khóa tự đặt lịch (UI-Screens.md; FR-BOOK-07, BR-15).
export const LOCKED_CUSTOMER_MESSAGES = {
  title: "Khách bị khóa tự đặt lịch",
  subtitle: "Hệ thống tự khóa khi khách vắng mặt quá 3 lần trong 30 ngày. Gỡ khóa sau khi khách liên hệ hotline.",
  note: "Khi bị khóa, khách vẫn đặt lịch được qua lễ tân tại quầy hoặc hotline.",
  emptyTitle: "Không có khách nào bị khóa.",
  emptyDescription: "Khách vắng mặt quá 3 lần trong 30 ngày sẽ xuất hiện ở đây.",
  dialogTitle: "Gỡ khóa tự đặt lịch?",
  dialogDescription: "Khách đã liên hệ cửa hàng qua hotline.",
  dialogEffect: "Khách có thể tự đặt lịch trực tuyến trở lại ngay sau khi gỡ khóa.",
  confirm: "Gỡ khóa",
  success: "Đã gỡ khóa tự đặt lịch",
  notLocked: "Khách hàng này không còn bị khóa tự đặt lịch.",
} as const;
