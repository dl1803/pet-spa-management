import type { CheckOutData } from "@/features/reception-check-out/check-out";
import type { AppointmentDetail, Payment, Pet, SizeGroup, Species } from "@/lib/api/types";
import { addDaysToDateKey, buildStoreDateTime, getStoreDateKey } from "@/lib/time";

// ID khớp với dữ liệu mô phỏng của màn Lịch hẹn và màn Chuồng: Tuyết (a1…08, chuồng B1), Mun (a1…12, chuồng B2), Nấm (a1…13, chuồng C2).
const uuid = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

export const MOCK_CHECK_OUT_IDS = {
  tuyet: uuid("a1", 8),
  mun: uuid("a1", 12),
  nam: uuid("a1", 13),
} as const;

type EntryInput = {
  n: number;
  customerName: string;
  petName: string;
  species: Species;
  breed: string;
  weightKg: number;
  sizeGroup: SizeGroup;
  cageN: number;
  cageCode: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  stayAmount: number;
  stayPaidAt: string;
  lateFee?: { amount: number; paidAt: string };
};

function makeEntry(createdAt: string, input: EntryInput): CheckOutData {
  const appointmentId = uuid("a1", input.n);
  const pet: Pet = {
    petId: uuid("b1", input.n),
    customerId: uuid("c1", input.n),
    name: input.petName,
    species: input.species,
    breed: input.breed,
    temperament: "Normal",
    weightKg: input.weightKg,
    heightCm: null,
    sizeGroup: input.sizeGroup,
    isActive: true,
  };
  const appointment: AppointmentDetail = {
    appointmentId,
    type: "Hotel",
    customerId: pet.customerId,
    petId: pet.petId,
    customerName: input.customerName,
    petName: input.petName,
    status: "InStay",
    sizeGroup: input.sizeGroup,
    actualWeightKg: input.weightKg,
    plannedCheckIn: input.plannedCheckIn,
    plannedCheckOut: input.plannedCheckOut,
    cageId: uuid("f1", input.cageN),
    createdAt,
    updatedAt: createdAt,
  };
  const payments: Payment[] = [
    {
      paymentId: uuid("e3", input.n),
      appointmentId,
      kind: "Stay",
      amount: input.stayAmount,
      status: "Paid",
      method: "Cash",
      receivedAmount: input.stayAmount,
      paidAt: input.stayPaidAt,
    },
  ];
  if (input.lateFee) {
    payments.push({
      paymentId: uuid("e4", input.n),
      appointmentId,
      kind: "LateFee",
      amount: input.lateFee.amount,
      status: "Paid",
      method: "BankQR",
      receivedAmount: input.lateFee.amount,
      paidAt: input.lateFee.paidAt,
    });
  }
  return { appointment, pet, cage: { code: input.cageCode, species: input.species, sizeGroup: input.sizeGroup }, payments };
}

// 3 lịch Đang lưu trú đã thu tiền lưu trú:
// - Tuyết: giờ trả dự kiến 18:00 hôm nay (khớp màn Lịch hẹn và màn Chuồng), trễ hay không tùy giờ hiện tại.
// - Mun: đã trễ 75 phút, chưa có phí trả muộn (lần xác nhận đầu tiên sẽ phát sinh phí và bị từ chối vì chưa thu).
// - Nấm: đã trễ 100 phút, phí trả muộn 100.000đ đã thu.
export function createMockCheckOutEntries(now: Date): CheckOutData[] {
  const todayKey = getStoreDateKey(now);
  const createdAt = buildStoreDateTime(addDaysToDateKey(todayKey, -4), "09:00");
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  return [
    makeEntry(createdAt, {
      n: 8, customerName: "Nguyễn Hải Yến", petName: "Tuyết", species: "Cat", breed: "Ba Tư", weightKg: 4.5, sizeGroup: "Medium",
      cageN: 2, cageCode: "B1",
      plannedCheckIn: buildStoreDateTime(addDaysToDateKey(todayKey, -2), "10:00"),
      plannedCheckOut: buildStoreDateTime(todayKey, "18:00"),
      stayAmount: 420000, stayPaidAt: buildStoreDateTime(addDaysToDateKey(todayKey, -2), "10:05"),
    }),
    makeEntry(createdAt, {
      n: 12, customerName: "Đặng Bảo Ngọc", petName: "Mun", species: "Cat", breed: "Mèo ta", weightKg: 3.8, sizeGroup: "Small",
      cageN: 7, cageCode: "B2",
      plannedCheckIn: buildStoreDateTime(addDaysToDateKey(todayKey, -3), "14:00"),
      plannedCheckOut: minutesAgo(75),
      stayAmount: 390000, stayPaidAt: buildStoreDateTime(addDaysToDateKey(todayKey, -3), "14:10"),
    }),
    makeEntry(createdAt, {
      n: 13, customerName: "Lương Quốc Việt", petName: "Nấm", species: "Rabbit", breed: "Hà Lan", weightKg: 2.6, sizeGroup: "Medium",
      cageN: 10, cageCode: "C2",
      plannedCheckIn: buildStoreDateTime(addDaysToDateKey(todayKey, -2), "09:00"),
      plannedCheckOut: minutesAgo(100),
      stayAmount: 330000, stayPaidAt: buildStoreDateTime(addDaysToDateKey(todayKey, -2), "09:10"),
      lateFee: { amount: 100000, paidAt: minutesAgo(10) },
    }),
  ];
}
