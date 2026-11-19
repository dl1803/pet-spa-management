import type { CheckInData, StayCharge, StayRate } from "@/features/reception-check-in/check-in";
import type { AppointmentDetail, Payment, Pet, SizeGroup, Species } from "@/lib/api/types";
import { addDaysToDateKey, buildStoreDateTime, countNights, getStoreDateKey } from "@/lib/time";

// ID lịch khớp với danh sách lịch hẹn để liên kết mở đúng lịch.
const uuid = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

export const MOCK_CHECK_IN_IDS = {
  spaBong: uuid("a1", 1),
  spaMuop: uuid("a1", 3),
  hotelCom: uuid("a1", 4),
  spaMit: uuid("a1", 5),
  spaSushi: uuid("a1", 7),
  hotelGau: uuid("a1", 9),
} as const;

// Quy tắc đối chiếu dùng riêng cho dữ liệu mô phỏng khi chưa nối backend thật.
export type MockWeightRule = {
  smallMaxKg: number;
  mediumMaxKg: number;
  toleranceKg: number;
  prices: Record<SizeGroup, number>;
  // Chỉ lịch lưu trú: đơn giá mỗi đêm theo nhóm kích cỡ. Số đêm × (giá + thức ăn) phải bằng prices của nhóm đó.
  hotelRates?: Record<SizeGroup, StayRate>;
};

export type MockCheckInEntry = {
  data: CheckInData;
  rule: MockWeightRule;
};

export const MOCK_CONFIRM_MINUTES = 30;

type EntryInput = {
  n: number;
  type: "Spa" | "Hotel";
  status: AppointmentDetail["status"];
  customerName: string;
  petName: string;
  species: Species;
  breed: string;
  weightKg: number;
  heightCm?: number;
  sizeGroup: SizeGroup;
  services?: string[];
  staffName?: string;
  start?: string;
  end?: string;
  cageCode?: string;
  cageN?: number;
  stayPaid?: boolean;
  rule: MockWeightRule;
};

// Khoản tiền lưu trú của lịch lưu trú: số đêm × (giá + thức ăn) theo nhóm kích cỡ của lịch.
function makeStay(todayKey: string, appointment: AppointmentDetail, n: number, rule: MockWeightRule, paid: boolean): StayCharge | null {
  if (appointment.type !== "Hotel" || !rule.hotelRates || !appointment.plannedCheckIn || !appointment.plannedCheckOut) return null;
  const rate = rule.hotelRates[appointment.sizeGroup];
  const amount = countNights(appointment.plannedCheckIn, appointment.plannedCheckOut) * (rate.pricePerNight + rate.foodPerNight);
  const payment: Payment = {
    paymentId: uuid("e2", n),
    appointmentId: appointment.appointmentId,
    kind: "Stay",
    amount,
    status: paid ? "Paid" : "Unpaid",
    method: paid ? "Cash" : null,
    receivedAmount: paid ? amount : null,
    paidAt: paid ? buildStoreDateTime(todayKey, "09:40") : null,
  };
  return { payment, rate };
}

function makeEntry(todayKey: string, input: EntryInput): MockCheckInEntry {
  const createdAt = buildStoreDateTime(addDaysToDateKey(todayKey, -1), "09:00");
  const pet: Pet = {
    petId: uuid("b1", input.n),
    customerId: uuid("c1", input.n),
    name: input.petName,
    species: input.species,
    breed: input.breed,
    temperament: "Normal",
    weightKg: input.weightKg,
    heightCm: input.heightCm ?? null,
    sizeGroup: input.sizeGroup,
    isActive: true,
  };
  const common = {
    appointmentId: uuid("a1", input.n),
    customerId: pet.customerId,
    petId: pet.petId,
    customerName: input.customerName,
    petName: input.petName,
    status: input.status,
    sizeGroup: input.sizeGroup,
    createdAt,
    updatedAt: createdAt,
  };
  const appointment: AppointmentDetail =
    input.type === "Spa"
      ? {
          ...common,
          type: "Spa",
          slotStart: buildStoreDateTime(todayKey, input.start ?? "09:00"),
          slotEnd: buildStoreDateTime(todayKey, input.end ?? "10:00"),
          staffRequired: 1,
          services: (input.services ?? []).map((name, index) => ({ serviceId: uuid("d1", index + 1), name, isDone: false })),
          staff: input.staffName ? [{ staffId: uuid("e1", input.n), fullName: input.staffName, isHolding: false }] : [],
        }
      : {
          ...common,
          type: "Hotel",
          plannedCheckIn: buildStoreDateTime(todayKey, input.start ?? "10:00"),
          plannedCheckOut: buildStoreDateTime(addDaysToDateKey(todayKey, 2), input.end ?? "12:00"),
          cageId: uuid("f1", input.cageN ?? 1),
        };
  const stay = makeStay(todayKey, appointment, input.n, input.rule, input.stayPaid ?? false);
  return { data: { appointment, pet, cageCode: input.cageCode ?? null, stay }, rule: input.rule };
}

// 6 lịch hẹn mẫu: 3 lịch spa Confirmed, 2 lịch lưu trú Confirmed (Cốm chưa cân và chưa thu tiền; Gấu đã cân và đã thu tiền
// lưu trú), 1 lịch spa Received đang chờ xác nhận chi phí.
export function createMockCheckInEntries(now: Date): MockCheckInEntry[] {
  const todayKey = getStoreDateKey(now);
  const bong = makeEntry(todayKey, {
    n: 1, type: "Spa", status: "Confirmed", customerName: "Trần Minh Anh", petName: "Bông", species: "Dog", breed: "Poodle",
    weightKg: 9, heightCm: 30, sizeGroup: "Small", services: ["Tắm & sấy", "Cắt tỉa"], staffName: "Hạnh", start: "09:00", end: "11:00",
    rule: { smallMaxKg: 10, mediumMaxKg: 25, toleranceKg: 1.5, prices: { Small: 270000, Medium: 330000, Large: 420000 } },
  });
  const muop = makeEntry(todayKey, {
    n: 3, type: "Spa", status: "Received", customerName: "Lê Thu Trang", petName: "Mướp", species: "Cat", breed: "Mèo ta",
    weightKg: 4, sizeGroup: "Small", services: ["Tắm & sấy lông"], staffName: "Tâm", start: "10:00", end: "11:00",
    rule: { smallMaxKg: 5, mediumMaxKg: 8, toleranceKg: 1, prices: { Small: 150000, Medium: 190000, Large: 240000 } },
  });
  muop.data.appointment.actualWeightKg = 6.5;
  muop.data.appointment.pendingCostConfirmation = {
    actualWeightKg: 6.5,
    newSizeGroup: "Medium",
    oldAmount: 150000,
    newAmount: 190000,
    status: "Pending",
    expiresAt: new Date(now.getTime() + 27 * 60_000).toISOString(),
  };
  const com = makeEntry(todayKey, {
    n: 4, type: "Hotel", status: "Confirmed", customerName: "Phạm Quốc Huy", petName: "Cốm", species: "Rabbit", breed: "Hà Lan",
    weightKg: 1.4, sizeGroup: "Small", cageCode: "C1", start: "10:00", end: "12:00",
    rule: {
      smallMaxKg: 2, mediumMaxKg: 5, toleranceKg: 0.3, prices: { Small: 250000, Medium: 330000, Large: 420000 },
      hotelRates: {
        Small: { pricePerNight: 100000, foodPerNight: 25000 },
        Medium: { pricePerNight: 120000, foodPerNight: 45000 },
        Large: { pricePerNight: 150000, foodPerNight: 60000 },
      },
    },
  });
  const mit = makeEntry(todayKey, {
    n: 5, type: "Spa", status: "Confirmed", customerName: "Võ Kim Ngân", petName: "Mít", species: "Dog", breed: "Phốc sóc",
    weightKg: 4, heightCm: 22, sizeGroup: "Small", services: ["Tắm & sấy"], staffName: "Hạnh", start: "12:00", end: "13:00",
    rule: { smallMaxKg: 10, mediumMaxKg: 25, toleranceKg: 1, prices: { Small: 200000, Medium: 260000, Large: 330000 } },
  });
  const sushi = makeEntry(todayKey, {
    n: 7, type: "Spa", status: "Confirmed", customerName: "Đinh Quang Vinh", petName: "Sushi", species: "Cat", breed: "Ba Tư",
    weightKg: 3.2, sizeGroup: "Medium", services: ["Tắm & sấy lông"], staffName: "Quyên", start: "15:00", end: "16:00",
    rule: { smallMaxKg: 3, mediumMaxKg: 6, toleranceKg: 0.3, prices: { Small: 140000, Medium: 170000, Large: 220000 } },
  });
  const gau = makeEntry(todayKey, {
    n: 9, type: "Hotel", status: "Confirmed", customerName: "Hoàng Gia Hân", petName: "Gấu", species: "Dog", breed: "Corgi",
    weightKg: 8, sizeGroup: "Small", cageCode: "A1", cageN: 3, start: "09:30", end: "11:00", stayPaid: true,
    rule: {
      smallMaxKg: 10, mediumMaxKg: 25, toleranceKg: 1.5, prices: { Small: 240000, Medium: 360000, Large: 480000 },
      hotelRates: {
        Small: { pricePerNight: 90000, foodPerNight: 30000 },
        Medium: { pricePerNight: 130000, foodPerNight: 50000 },
        Large: { pricePerNight: 170000, foodPerNight: 70000 },
      },
    },
  });
  gau.data.appointment.actualWeightKg = 8.2;
  return [bong, muop, com, mit, sushi, gau];
}
