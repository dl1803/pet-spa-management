import type { AppointmentDetail, AppointmentStatus, Species } from "@/lib/api/types";
import { addDaysToDateKey, buildStoreDateTime } from "@/lib/time";
import type { ReceptionAppointmentRow } from "./list";

// Dữ liệu mô phỏng cho danh sách lịch hẹn của lễ tân.
const uuid = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

const STAFF_IDS: Record<string, string> = { Hạnh: uuid("e1", 1), Quyên: uuid("e1", 2), Tâm: uuid("e1", 3) };

type SpaInput = {
  n: number;
  customerN: number;
  customerName: string;
  petName: string;
  species: Species;
  breed: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  staffName?: string;
};

type HotelInput = {
  n: number;
  customerN: number;
  customerName: string;
  petName: string;
  species: Species;
  breed: string;
  checkInOffset: number;
  checkInTime: string;
  checkOutOffset: number;
  checkOutTime: string;
  status: AppointmentStatus;
  cageId: string;
  cageCode: string;
};

function spaRow(dateKey: string, input: SpaInput): ReceptionAppointmentRow {
  const createdAt = buildStoreDateTime(addDaysToDateKey(dateKey, -1), "09:00");
  const appointment: AppointmentDetail = {
    appointmentId: uuid("a1", input.n),
    type: "Spa",
    customerId: uuid("c1", input.customerN),
    petId: uuid("b1", input.n),
    customerName: input.customerName,
    petName: input.petName,
    status: input.status,
    sizeGroup: "Small",
    slotStart: buildStoreDateTime(dateKey, input.start),
    slotEnd: buildStoreDateTime(dateKey, input.end),
    staffRequired: 1,
    createdAt,
    updatedAt: createdAt,
    staff: input.staffName ? [{ staffId: STAFF_IDS[input.staffName], fullName: input.staffName, isHolding: false }] : [],
  };
  return { appointment, species: input.species, breed: input.breed, cageCode: null };
}

function hotelRow(dateKey: string, input: HotelInput): ReceptionAppointmentRow {
  const createdAt = buildStoreDateTime(addDaysToDateKey(dateKey, -3), "09:00");
  const appointment: AppointmentDetail = {
    appointmentId: uuid("a1", input.n),
    type: "Hotel",
    customerId: uuid("c1", input.customerN),
    petId: uuid("b1", input.n),
    customerName: input.customerName,
    petName: input.petName,
    status: input.status,
    sizeGroup: "Small",
    plannedCheckIn: buildStoreDateTime(addDaysToDateKey(dateKey, input.checkInOffset), input.checkInTime),
    plannedCheckOut: buildStoreDateTime(addDaysToDateKey(dateKey, input.checkOutOffset), input.checkOutTime),
    cageId: input.cageId,
    createdAt,
    updatedAt: createdAt,
  };
  return { appointment, species: input.species, breed: input.breed, cageCode: input.cageCode };
}

export function buildMockReceptionAppointments(dateKey: string): ReceptionAppointmentRow[] {
  return [
    spaRow(dateKey, { n: 1, customerN: 1, customerName: "Trần Minh Anh", petName: "Bông", species: "Dog", breed: "Poodle", start: "09:00", end: "10:00", status: "Confirmed", staffName: "Hạnh" }),
    spaRow(dateKey, { n: 2, customerN: 2, customerName: "Đỗ Gia Bảo", petName: "Nâu", species: "Dog", breed: "Corgi", start: "09:00", end: "10:30", status: "InProgress", staffName: "Quyên" }),
    spaRow(dateKey, { n: 3, customerN: 3, customerName: "Lê Thu Trang", petName: "Mướp", species: "Cat", breed: "Mèo ta", start: "10:00", end: "11:00", status: "Received", staffName: "Tâm" }),
    hotelRow(dateKey, { n: 4, customerN: 4, customerName: "Phạm Quốc Huy", petName: "Cốm", species: "Rabbit", breed: "Hà Lan", checkInOffset: 0, checkInTime: "10:00", checkOutOffset: 2, checkOutTime: "12:00", status: "Confirmed", cageId: uuid("f1", 1), cageCode: "C1" }),
    spaRow(dateKey, { n: 5, customerN: 5, customerName: "Võ Kim Ngân", petName: "Mít", species: "Dog", breed: "Phốc sóc", start: "12:00", end: "13:00", status: "Confirmed", staffName: "Hạnh" }),
    spaRow(dateKey, { n: 6, customerN: 1, customerName: "Trần Minh Anh", petName: "Mochi", species: "Cat", breed: "Anh lông ngắn", start: "14:00", end: "15:00", status: "Pending" }),
    spaRow(dateKey, { n: 7, customerN: 6, customerName: "Đinh Quang Vinh", petName: "Sushi", species: "Cat", breed: "Ba Tư", start: "15:00", end: "16:30", status: "Confirmed", staffName: "Quyên" }),
    hotelRow(dateKey, { n: 8, customerN: 7, customerName: "Nguyễn Hải Yến", petName: "Tuyết", species: "Cat", breed: "Ba Tư", checkInOffset: -2, checkInTime: "10:00", checkOutOffset: 0, checkOutTime: "18:00", status: "InStay", cageId: uuid("f1", 2), cageCode: "B1" }),
  ];
}

