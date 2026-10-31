import type {
  AppointmentStatus,
  AppointmentType,
  CancelReason,
  PaymentMethod,
  SizeGroup,
  Species,
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
