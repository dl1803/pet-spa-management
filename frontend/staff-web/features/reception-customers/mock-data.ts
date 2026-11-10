import type { AppointmentStatus, AppointmentType, Customer, Pet } from "@/lib/api/types";

// Mã giả cố định để dữ liệu mô phỏng ổn định giữa các lần chạy: c2… là khách, b2… là thú cưng.
// Hai khách đầu và ba thú cưng đầu dùng cùng mã với dữ liệu mô phỏng của màn Đặt lịch thay,
// để liên kết “Đặt lịch thay” tìm được khách; hai bộ dữ liệu độc lập, không import lẫn nhau.
export function mockUuid(prefix: string, index: number) {
  return `${prefix}000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

export const MOCK_CUSTOMER_IDS = {
  binh: mockUuid("c2", 1),
  linh: mockUuid("c2", 2),
  minhAnh: mockUuid("c2", 3),
  hung: mockUuid("c2", 4),
} as const;

export function createMockCustomers(): Customer[] {
  return [
    { customerId: MOCK_CUSTOMER_IDS.binh, fullName: "Ngô Thanh Bình", phone: "0962345118", email: null, isBookingLocked: false },
    { customerId: MOCK_CUSTOMER_IDS.linh, fullName: "Trần Mỹ Linh", phone: "0912345678", email: null, isBookingLocked: false },
    {
      customerId: MOCK_CUSTOMER_IDS.minhAnh,
      fullName: "Trần Minh Anh",
      phone: "0903412678",
      email: "minhanh.tran@gmail.com",
      isBookingLocked: false,
    },
    { customerId: MOCK_CUSTOMER_IDS.hung, fullName: "Lê Quốc Hưng", phone: "0935123456", email: null, isBookingLocked: true },
  ];
}

// sizeGroup khớp bảng mốc mặc định của lib/size-estimate.ts (dữ liệu mô phỏng tự nhất quán).
export function createMockPets(): Pet[] {
  return [
    {
      petId: mockUuid("b2", 1),
      customerId: MOCK_CUSTOMER_IDS.binh,
      name: "Bắp",
      species: "Dog",
      breed: "Corgi",
      temperament: "Difficult",
      weightKg: 11,
      heightCm: 30,
      coatNote: "Lông ngắn hai lớp, vàng trắng",
      notes: "Hay cắn khi bị giữ chân sau. Đã tiêm phòng dại tháng 08/2026.",
      sizeGroup: "Medium",
      isActive: true,
    },
    {
      petId: mockUuid("b2", 2),
      customerId: MOCK_CUSTOMER_IDS.binh,
      name: "Mướp",
      species: "Cat",
      breed: "Anh lông ngắn",
      temperament: "Normal",
      weightKg: 4,
      heightCm: null,
      coatNote: null,
      notes: null,
      sizeGroup: "Medium",
      isActive: true,
    },
    {
      petId: mockUuid("b2", 3),
      customerId: MOCK_CUSTOMER_IDS.binh,
      name: "Cốm",
      species: "Rabbit",
      breed: "Hà Lan",
      temperament: "Calm",
      weightKg: 1.8,
      heightCm: null,
      coatNote: null,
      notes: null,
      sizeGroup: "Medium",
      isActive: true,
    },
    {
      petId: mockUuid("b2", 4),
      customerId: MOCK_CUSTOMER_IDS.minhAnh,
      name: "Bông",
      species: "Dog",
      breed: "Poodle",
      temperament: "Calm",
      weightKg: 9,
      heightCm: 28,
      coatNote: null,
      notes: null,
      sizeGroup: "Small",
      isActive: true,
    },
    {
      petId: mockUuid("b2", 5),
      customerId: MOCK_CUSTOMER_IDS.minhAnh,
      name: "Mochi",
      species: "Cat",
      breed: "Anh lông ngắn",
      temperament: "Normal",
      weightKg: 4.2,
      heightCm: null,
      coatNote: null,
      notes: null,
      sizeGroup: "Medium",
      isActive: true,
    },
  ];
}

// Dữ liệu mô phỏng cho khối "Lịch hẹn gần đây" của màn SW-04 (UI-Screens SW-04 vùng 2 & G-06).
// Dùng ISO datetime khớp schema Appointment trong openapi.yaml.
export type CustomerRecentAppointment = {
  appointmentId: string;
  customerId: string;
  petId: string;
  petName: string;
  type: AppointmentType;
  status: AppointmentStatus;
  slotStart?: string | null;
  slotEnd?: string | null;
  plannedCheckIn?: string | null;
  plannedCheckOut?: string | null;
  servicesSummary?: string;
};

export function createMockRecentAppointments(): CustomerRecentAppointment[] {
  return [
    {
      appointmentId: mockUuid("a2", 1),
      customerId: MOCK_CUSTOMER_IDS.minhAnh,
      petId: mockUuid("b2", 4),
      petName: "Bông",
      type: "Spa",
      status: "Confirmed",
      slotStart: "2026-10-06T09:00:00+07:00",
      slotEnd: "2026-10-06T10:00:00+07:00",
      servicesSummary: "Tắm & sấy lông, Cắt tỉa lông",
    },
    {
      appointmentId: mockUuid("a2", 2),
      customerId: MOCK_CUSTOMER_IDS.minhAnh,
      petId: mockUuid("b2", 5),
      petName: "Mochi",
      type: "Spa",
      status: "Pending",
      slotStart: "2026-10-06T14:00:00+07:00",
      slotEnd: "2026-10-06T15:00:00+07:00",
      servicesSummary: "Tắm & sấy lông, Cắt tỉa lông",
    },
    {
      appointmentId: mockUuid("a2", 3),
      customerId: MOCK_CUSTOMER_IDS.binh,
      petId: mockUuid("b2", 1),
      petName: "Bắp",
      type: "Spa",
      status: "Completed",
      slotStart: "2026-10-05T10:00:00+07:00",
      slotEnd: "2026-10-05T11:00:00+07:00",
      servicesSummary: "Tắm & sấy lông",
    },
  ];
}


