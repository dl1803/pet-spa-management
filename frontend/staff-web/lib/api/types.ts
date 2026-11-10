export type StaffRole = "Receptionist" | "SpaStaff";

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

export type ConfirmSpaRequest = {
  // Đủ số nhân viên cần của lịch hẹn (staffRequired).
  staffIds: string[];
  // Đề xuất OpenAPI cho xác nhận nhân viên ngoài ca.
  confirmOutOfShift?: boolean;
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
  url: string;
  uploadedAt: string;
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

export type Customer = {
  customerId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  isBookingLocked: boolean;
};

export type HotelBookingRequest = {
  petId: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  customerId?: string;
};

export type HotelBookingCreated = {
  appointmentId: string;
  status: AppointmentStatus;
  nights: number;
  estimatedAmount: number;
};

export type HotelAvailability = {
  available: boolean;
  nights: number;
  estimatedAmount: number;
};

export type HotelPricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  pricePerNight: number;
  foodPerNight: number;
};

export type ActualWeightRequest = {
  actualWeightKg: number;
};

export type WeightCheckResult = "OK" | "PRICE_DECREASED" | "NEEDS_CONFIRMATION";

export type WeightCheck = {
  result: WeightCheckResult;
  newSizeGroup?: SizeGroup;
  oldAmount?: number;
  newAmount?: number;
  expiresAt?: string;
};

export type CheckInResult = {
  status: AppointmentStatus;
  weightCheck?: WeightCheck;
};

export type WeightCheckResponse = {
  weightCheck: WeightCheck;
};

export type CostConfirmationRespondRequest = {
  accept: boolean;
};

export type StatusResult = {
  status: AppointmentStatus;
};

export type WalkInRequest = {
  fullName: string;
  phone: string;
};

export type WalkInCreated = {
  customerId: string;
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
  // Lễ tân bắt buộc kèm khi tạo hồ sơ; khi sửa API bỏ qua trường này.
  customerId?: string;
};

export type PetSizeResult = {
  // Chỉ có ở phản hồi tạo hồ sơ.
  petId?: string;
  sizeGroup: SizeGroup;
};


