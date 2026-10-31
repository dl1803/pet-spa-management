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
