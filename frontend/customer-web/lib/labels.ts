import type {
  AppointmentStatus,
  AppointmentType,
  CancelReason,
  NotificationType,
  PaymentMethod,
  SizeGroup,
  Species,
  Temperament,
} from "@/lib/api/types";

export const SPECIES_LABELS: Record<Species, string> = {
  Dog: "Chó",
  Cat: "Mèo",
  Rabbit: "Thỏ",
  GuineaPig: "Chuột lang",
};

export const SIZE_GROUP_LABELS: Record<SizeGroup, string> = {
  Small: "Nhỏ",
  Medium: "Vừa",
  Large: "Lớn",
};

export const TEMPERAMENT_LABELS: Record<Temperament, string> = {
  Calm: "Hiền",
  Normal: "Bình thường",
  Difficult: "Khó tính, dữ",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  Pending: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  Received: "Đã tiếp nhận",
  InProgress: "Đang thực hiện",
  InStay: "Đang lưu trú",
  Completed: "Hoàn tất",
  Cancelled: "Đã hủy",
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  Spa: "Spa",
  Hotel: "Lưu trú",
};

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  CustomerCancelled: "Khách hàng chủ động hủy",
  StoreUnable: "Cửa hàng không thể đáp ứng",
  CustomerBeyondDeadline: "Theo yêu cầu của khách, ngoài thời hạn tự hủy",
  NoShow: "Vắng mặt quá 15 phút sau giờ hẹn",
  CostNotConfirmed: "Không xác nhận chi phí mới",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  Cash: "Tiền mặt",
  BankQR: "Chuyển khoản QR",
  Online: "Trực tuyến",
};

// Dòng đậm của thông báo: API chỉ trả `message` nên tiêu đề lấy theo `type` (UI-Screens CW-12, phần Hành vi).
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  BookingReceived: "Đã nhận yêu cầu đặt lịch",
  ConfirmedAssigned: "Lịch hẹn đã được xác nhận",
  StatusChanged: "Trạng thái lịch hẹn đã thay đổi",
  Cancelled: "Lịch hẹn đã hủy",
  PaymentRecorded: "Đã ghi nhận thanh toán",
  CostConfirmation: "Cần xác nhận chi phí mới",
};
