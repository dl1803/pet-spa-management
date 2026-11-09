export type Species = "Dog" | "Cat" | "Rabbit" | "GuineaPig";
export type SizeGroup = "Small" | "Medium" | "Large";
export type Temperament = "Calm" | "Normal" | "Difficult";

export type Pet = {
  petId: string;
  customerId: string;
  name: string;
  species: Species;
  breed: string;
  temperament: Temperament;
  weightKg: number;
  heightCm?: number | null;
  coatNote?: string | null;
  notes?: string | null;
  sizeGroup: SizeGroup;
  isActive: boolean;
};

export type PetRequest = {
  name: string;
  species: Species;
  breed: string;
  temperament?: Temperament;
  weightKg: number;
  heightCm?: number | null;
  coatNote?: string | null;
  notes?: string | null;
};

export type PetSizeResult = {
  // Chỉ có ở phản hồi tạo hồ sơ.
  petId?: string;
  sizeGroup: SizeGroup;
};

export type PetPage = {
  items: Pet[];
  page: number;
  pageSize: number;
  total: number;
};

export type PricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  price: number;
  durationMinutes: number;
  staffRequired: 1 | 2;
};

export type Service = {
  serviceId: string;
  name: string;
  description?: string | null;
  latestStartTime: string;
  isActive: boolean;
  pricing: PricingRow[];
};

export type SlotStatus = "Available" | "Full" | "NotAccepted";

export type SlotInfo = {
  // HH:mm theo múi giờ cửa hàng.
  time: string;
  // Chuỗi tự do từ API; web chia nhóm theo giờ bắt đầu.
  group: string;
  status: SlotStatus;
};

export type SpaSlots = {
  durationMinutes: number;
  staffRequired: 1 | 2;
  bufferMinutes: number;
  slots: SlotInfo[];
};

export type SpaBookingRequest = {
  petId: string;
  serviceIds: string[];
  // ISO 8601 có độ lệch +07:00, dựng bằng buildStoreDateTime.
  slotStart: string;
};

export type SpaBookingCreated = {
  appointmentId: string;
  type?: AppointmentType;
  status: AppointmentStatus;
  sizeGroup?: SizeGroup;
  slotStart?: string;
  slotEnd: string;
  staffRequired: 1 | 2;
  estimatedAmount: number;
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
export type PaymentKind = "Spa" | "Stay" | "LateFee";
export type PaymentStatus = "Unpaid" | "Paid";
export type PaymentMethod = "Cash" | "BankQR" | "Online";

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

export type AppointmentDetail = Appointment & {
  services?: AppointmentServiceItem[];
  staff?: AppointmentStaffItem[];
};

export type Payment = {
  paymentId: string;
  appointmentId: string;
  kind: PaymentKind;
  amount: number;
  status: PaymentStatus;
  method?: PaymentMethod | null;
  receivedAmount?: number | null;
  paidAt?: string | null;
};

export type NotificationType =
  | "BookingReceived"
  | "ConfirmedAssigned"
  | "StatusChanged"
  | "Cancelled"
  | "PaymentRecorded"
  | "CostConfirmation";

export type Notification = {
  notificationId: string;
  type: NotificationType;
  appointmentId?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPage = {
  items: Notification[];
  page: number;
  pageSize: number;
  total: number;
  // Số thông báo chưa đọc của cả danh sách, không chỉ của trang này.
  unread: number;
};


export type Role = "Customer" | "Staff" | "Manager";

export type RegisterRequest = {
  userName: string;
  fullName: string;
  password: string;
  email?: string;
};

export type RegisterResponse = {
  userId: string;
};

export type LoginRequest = {
  userName: string;
  password: string;
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

export type Me = {
  userId: string;
  userName: string;
  role: Role;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type UpdateMeRequest = {
  fullName?: string;
  phone?: string;
  email?: string;
};
