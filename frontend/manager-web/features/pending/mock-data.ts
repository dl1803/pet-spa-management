import type { Cage, HotelSuggestions, SizeGroup, SpaSuggestions, Species } from "@/lib/api/types";
import type { SpaPendingReason } from "./spa-summary";

// Dữ liệu mô phỏng theo UI demo (MW-04, lịch spa): đề xuất đúng hình dạng SpaSuggestions của
// GET /appointments/{id}/suggestions. Thông tin còn lại chưa có trong API: SĐT, khách có tài khoản, số tiền
// (UI-Screens G-05) và lý do chờ xác nhận (G-08). `amount` là số tiền server tính (FR-PAY-01), nhập sẵn để hiển thị,
// không suy ra từ dữ liệu khác. Thay bằng dữ liệu API thật khi nối backend.
export type MockStaffAssignment = {
  appointmentId: string;
  title: string;
  customerName: string;
  customerPhone: string;
  hasAccount: boolean;
  species: Species;
  serviceNames: string[];
  // ISO 8601, như slotStart, slotEnd của Appointment.
  slotStart: string;
  slotEnd: string;
  // Booking.BufferMinutes từ GET /config (15 – 20 phút).
  bufferMinutes: number;
  // VND, số nguyên.
  amount: number;
  pendingReason: SpaPendingReason | null;
  suggestions: SpaSuggestions;
};

const TAM = { staffId: "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f01", fullName: "Lê Minh Tâm", recentAssignmentCount: 5 };
const HANH = { staffId: "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f02", fullName: "Nguyễn Thị Hạnh", recentAssignmentCount: 6 };
const QUYEN = { staffId: "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f03", fullName: "Trần Thị Quyên", recentAssignmentCount: 9 };

export const MOCK_STAFF_ASSIGNMENTS: MockStaffAssignment[] = [
  {
    appointmentId: "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01",
    title: "Mochi, mèo Anh lông ngắn, nhóm Vừa",
    customerName: "Trần Minh Anh",
    customerPhone: "0903 412 678",
    hasAccount: true,
    species: "Cat",
    serviceNames: ["Tắm & sấy lông", "Cắt tỉa lông"],
    slotStart: "2026-10-06T14:00:00+07:00",
    slotEnd: "2026-10-06T16:00:00+07:00",
    bufferMinutes: 15,
    amount: 330000,
    pendingReason: null,
    suggestions: { staffRequired: 1, suggested: [TAM], alternatives: [HANH, QUYEN] },
  },
  {
    appointmentId: "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e04",
    title: "Đậu, chó Shih Tzu, nhóm Nhỏ",
    customerName: "Phan Mỹ Linh",
    customerPhone: "0916 228 905",
    hasAccount: true,
    species: "Dog",
    serviceNames: ["Cắt tỉa lông", "Vệ sinh tai & cắt móng"],
    slotStart: "2026-10-07T10:00:00+07:00",
    slotEnd: "2026-10-07T11:20:00+07:00",
    bufferMinutes: 15,
    amount: 180000,
    pendingReason: {
      kind: "CustomerChanged",
      changedAt: "2026-10-05T20:30:00+07:00",
      previousSlotStart: "2026-10-06T15:00:00+07:00",
      previousServiceNames: ["Cắt tỉa lông"],
      previousAmount: 120000,
    },
    suggestions: { staffRequired: 1, suggested: [TAM], alternatives: [HANH, QUYEN] },
  },
  {
    appointmentId: "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e02",
    title: "Lu, chó Golden, nhóm Lớn",
    customerName: "Võ Thanh Tùng",
    customerPhone: "0907 113 482",
    hasAccount: true,
    species: "Dog",
    serviceNames: ["Tắm & sấy lông"],
    slotStart: "2026-10-07T13:00:00+07:00",
    slotEnd: "2026-10-07T14:30:00+07:00",
    bufferMinutes: 15,
    amount: 240000,
    pendingReason: {
      kind: "StaffDeactivated",
      deactivatedStaffName: "Phúc",
      deactivatedAt: "2026-10-05T18:00:00+07:00",
      removedStaffNames: ["Hạnh", "Phúc"],
    },
    suggestions: { staffRequired: 2, suggested: [TAM, HANH], alternatives: [QUYEN] },
  },
];

// Dữ liệu mô phỏng theo UI demo (MW-04, lịch lưu trú của bé Mây): đề xuất đúng hình dạng HotelSuggestions của
// GET /appointments/{id}/suggestions, danh sách chuồng đúng hình dạng Cage của GET /cages.
export type MockCageAssignment = {
  appointmentId: string;
  title: string;
  // Khách (SĐT: UI-Screens G-05, chưa có trong API).
  customerName: string;
  customerPhone: string;
  hasAccount: boolean;
  species: Species;
  sizeGroup: SizeGroup;
  // ISO 8601.
  plannedCheckIn: string;
  plannedCheckOut: string;
  // Đơn giá từ GET /hotel/pricing (pricePerNight, foodPerNight), chỉ để hiển thị tạm tính.
  pricePerNight: number;
  foodPerNight: number;
  suggestions: HotelSuggestions;
  cages: Cage[];
};

const cageId = (n: number) => `c0000000-0000-4000-8000-00000000000${n}`;

const CAGE_B1: Cage = {
  cageId: cageId(1),
  code: "B1",
  species: "Cat",
  sizeGroup: "Medium",
  isActive: true,
  occupant: {
    petId: "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f11",
    petName: "Kem",
    customerId: "8b1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f21",
    customerName: "Phạm Thu Hà",
    plannedCheckOut: "2026-10-06T18:00:00+07:00",
  },
};
const CAGE_B2: Cage = { cageId: cageId(2), code: "B2", species: "Cat", sizeGroup: "Small", isActive: true, occupant: null };
const CAGE_B3: Cage = { cageId: cageId(3), code: "B3", species: "Cat", sizeGroup: "Medium", isActive: true, occupant: null };
const CAGE_B4: Cage = { cageId: cageId(4), code: "B4", species: "Cat", sizeGroup: "Large", isActive: true, occupant: null };

export const MOCK_CAGE_ASSIGNMENTS: MockCageAssignment[] = [
  {
    appointmentId: "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03",
    title: "Mây, mèo Xiêm, nhóm Vừa",
    customerName: "Lý Ngọc Hân",
    customerPhone: "0935 470 218",
    hasAccount: true,
    species: "Cat",
    sizeGroup: "Medium",
    plannedCheckIn: "2026-10-08T09:00:00+07:00",
    plannedCheckOut: "2026-10-10T17:00:00+07:00",
    pricePerNight: 170000,
    foodPerNight: 40000,
    suggestions: { cage: CAGE_B3 },
    cages: [CAGE_B1, CAGE_B2, CAGE_B3, CAGE_B4],
  },
];
