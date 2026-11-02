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

export type HotelSuggestions = {
  cage: Cage;
};

export type ConfirmHotelRequest = {
  cageId: string;
};
