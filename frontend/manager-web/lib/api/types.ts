// Kiểu dữ liệu chép đúng tên và kiểu của schema trong openapi.yaml (Frontend-Architecture 7.2).
// Chỉ khai báo kiểu đang được dùng.

export type StaffSuggestion = {
  staffId: string;
  fullName: string;
  // Số lịch được phân công trong Suggest.LookbackDays ngày gần nhất.
  recentAssignmentCount?: number;
};

export type SpaSuggestions = {
  staffRequired: 1 | 2;
  // Đủ staffRequired người.
  suggested: StaffSuggestion[];
  alternatives: StaffSuggestion[];
};

export type Species = "Dog" | "Cat" | "Rabbit" | "GuineaPig";
export type SizeGroup = "Small" | "Medium" | "Large";

export type PricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  // VND, số nguyên ≥ 0.
  price: number;
  durationMinutes: number;
  staffRequired: 1 | 2;
};

export type Service = {
  serviceId: string;
  name: string;
  description?: string | null;
  // HH:mm, thuộc Booking.SlotTimes.
  latestStartTime: string;
  isActive: boolean;
  pricing: PricingRow[];
};

export type ServiceRequest = {
  name: string;
  description?: string;
  latestStartTime: string;
  pricing: PricingRow[];
};

export type CageOccupant = {
  petId: string;
  petName: string;
  customerId: string;
  customerName: string;
  // ISO 8601.
  plannedCheckOut: string;
};

export type Cage = {
  cageId: string;
  // Tối đa 20 ký tự.
  code: string;
  species: Species;
  sizeGroup: SizeGroup;
  isActive: boolean;
  // null hoặc không có = chuồng trống.
  occupant?: CageOccupant | null;
};

export type CageCreateRequest = {
  // Tối đa 20 ký tự.
  code: string;
  species: Species;
  sizeGroup: SizeGroup;
};

// Mọi trường đều tùy chọn theo openapi; web luôn gửi đủ cả ba.
export type CageUpdateRequest = Partial<CageCreateRequest>;

export type HotelPricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  // VND, số nguyên ≥ 0.
  pricePerNight: number;
  foodPerNight: number;
};

export type HotelPricing = {
  pricing: HotelPricingRow[];
  // VND, số nguyên ≥ 0 (Hotel.LateFeePerBlock).
  lateFeePerBlock: number;
};

export type HotelSuggestions = {
  cage: Cage;
};

export type ConfirmHotelRequest = {
  cageId: string;
};

export type ConfirmSpaRequest = {
  // Đủ số nhân viên cần của lịch hẹn (staffRequired).
  staffIds: string[];
  // Đề xuất OpenAPI cho xác nhận nhân viên ngoài ca.
  confirmOutOfShift?: boolean;
};

export type StaffRole = "Receptionist" | "SpaStaff";

export type Staff = {
  staffId: string;
  // Số điện thoại, dùng làm tên đăng nhập.
  userName: string;
  fullName: string;
  staffRole: StaffRole;
  isActive: boolean;
};

export type StaffCreateRequest = {
  // Số điện thoại, tối đa 20 ký tự.
  userName: string;
  // Tối đa 150 ký tự.
  fullName: string;
  staffRole: StaffRole;
  password: string;
};

export type StaffUpdateRequest = {
  // Tối đa 150 ký tự.
  fullName: string;
  staffRole: StaffRole;
};

export type PaymentKind = "Spa" | "Stay" | "LateFee";
export type PaymentStatus = "Unpaid" | "Paid";
export type PaymentMethod = "Cash" | "BankQR" | "Online";
// Phương thức được ghi nhận tại quầy (openapi CounterPaymentMethod); Online chỉ do webhook của cổng đặt.
export type CounterPaymentMethod = "Cash" | "BankQR";

export type Payment = {
  paymentId: string;
  appointmentId: string;
  kind: PaymentKind;
  // VND, số nguyên ≥ 0, do hệ thống tính (FR-PAY-01); web chỉ hiển thị, không tính lại và không gửi lên.
  amount: number;
  status: PaymentStatus;
  method?: PaymentMethod | null;
  receivedAmount?: number | null;
  // ISO 8601.
  paidAt?: string | null;
};

export type PaymentPage = {
  page: number;
  pageSize: number;
  total: number;
  items: Payment[];
};

export type CounterPaymentRequest = {
  method: CounterPaymentMethod;
  // VND, số nguyên; phải ≥ amount của khoản (BR-17).
  receivedAmount: number;
};

export type AppointmentType = "Spa" | "Hotel";
export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Received"
  | "InProgress"
  | "InStay"
  | "Completed"
  | "Cancelled";
export type CancelReason =
  | "CustomerCancelled"
  | "StoreUnable"
  | "CustomerBeyondDeadline"
  | "NoShow"
  | "CostNotConfirmed";

export type Appointment = {
  appointmentId: string;
  type: AppointmentType;
  customerId: string;
  petId: string;
  customerName?: string;
  petName?: string;
  status: AppointmentStatus;
  cancelReason?: CancelReason | null;
  cancelledAt?: string | null;
  sizeGroup: SizeGroup;
  actualWeightKg?: number | null;
  slotStart?: string | null;
  slotEnd?: string | null;
  staffRequired?: 1 | 2 | null;
  plannedCheckIn?: string | null;
  plannedCheckOut?: string | null;
  actualCheckOut?: string | null;
  cageId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentServiceItem = {
  serviceId: string;
  name?: string;
  isDone: boolean;
  doneAt?: string | null;
  note?: string | null;
};

export type AppointmentStaffItem = {
  staffId: string;
  fullName?: string;
  isHolding: boolean;
  assignedAt?: string;
};

export type CostConfirmationStatus = "Pending" | "Accepted" | "Rejected" | "Expired";

export type CostConfirmation = {
  actualWeightKg: number;
  newSizeGroup: SizeGroup;
  oldAmount: number;
  newAmount: number;
  status: CostConfirmationStatus;
  createdAt?: string;
  expiresAt: string;
  respondedAt?: string | null;
};

export type AppointmentDetail = Appointment & {
  services?: AppointmentServiceItem[];
  staff?: AppointmentStaffItem[];
  pendingCostConfirmation?: CostConfirmation | null;
};

export type PhotoKind = "Before" | "After";

export type Photo = {
  photoId: string;
  kind: PhotoKind;
  // URL tạm thời do backend trả (listPhotos).
  url: string;
  // ISO 8601.
  uploadedAt: string;
};

export type WorkShift = {
  shiftId: string;
  staffId: string;
  // ISO 8601.
  shiftStart: string;
  shiftEnd: string;
};

export type Role = "Customer" | "Staff" | "Manager";

export type Me = {
  userId: string;
  userName: string;
  role: Role;
  // Chỉ có khi role là Staff.
  staffRole?: StaffRole | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type LoginRequest = {
  userName: string;
  password: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

// Phản hồi của route handler phiên (/api/session/*); refresh token chỉ nằm trong cookie httpOnly.
export type SessionLoginResponse = {
  accessToken: string;
  me: Me;
};

export type SessionRefreshResponse = {
  accessToken: string;
};
