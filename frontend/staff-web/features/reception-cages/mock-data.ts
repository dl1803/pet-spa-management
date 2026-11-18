import type { InStayRef } from "@/features/reception-cages/cages";
import type { Cage, CageOccupant, SizeGroup, Species } from "@/lib/api/types";
import { addDaysToDateKey, buildStoreDateTime, getStoreDateKey } from "@/lib/time";

// cageId f1…01 (C1) và f1…02 (B1) trùng cageId trong dữ liệu mô phỏng của màn Lịch hẹn;
// petId b1…08 và appointmentId a1…08 là của Tuyết, trùng với màn Lịch hẹn và màn Trả thú cưng.
const uuid = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

export function createMockCages(now: Date): Cage[] {
  const todayKey = getStoreDateKey(now);
  const cage = (n: number, code: string, species: Species, sizeGroup: SizeGroup, extra: Partial<Cage> = {}): Cage => ({
    cageId: uuid("f1", n),
    code,
    species,
    sizeGroup,
    isActive: true,
    occupant: null,
    ...extra,
  });
  const occupant = (petN: number, petName: string, customerN: number, customerName: string, plannedCheckOut: string): CageOccupant => ({
    petId: uuid("b1", petN),
    petName,
    customerId: uuid("c1", customerN),
    customerName,
    plannedCheckOut,
  });
  return [
    cage(3, "A1", "Dog", "Small"),
    cage(4, "A2", "Dog", "Medium", {
      occupant: occupant(10, "Bơ", 10, "Trương Hoài Nam", buildStoreDateTime(addDaysToDateKey(todayKey, 1), "17:00")),
    }),
    cage(5, "A3", "Dog", "Large"),
    cage(6, "A4", "Dog", "Medium", { isActive: false }),
    cage(2, "B1", "Cat", "Medium", {
      occupant: occupant(8, "Tuyết", 7, "Nguyễn Hải Yến", buildStoreDateTime(todayKey, "18:00")),
    }),
    cage(7, "B2", "Cat", "Small"),
    cage(8, "B3", "Cat", "Medium"),
    cage(9, "B4", "Cat", "Large"),
    cage(1, "C1", "Rabbit", "Small"),
    cage(10, "C2", "Rabbit", "Medium"),
    cage(11, "D1", "GuineaPig", "Small"),
    cage(12, "D2", "GuineaPig", "Large", {
      occupant: occupant(11, "Kem", 11, "Lý Thảo", buildStoreDateTime(addDaysToDateKey(todayKey, 3), "10:00")),
    }),
  ];
}

// Thay cho GET /appointments?type=Hotel&status=InStay: ba lịch Đang lưu trú tương ứng ba chuồng đang chứa.
export function createMockInStayRefs(): InStayRef[] {
  return [8, 10, 11].map((n) => ({ appointmentId: uuid("a1", n), petId: uuid("b1", n) }));
}
