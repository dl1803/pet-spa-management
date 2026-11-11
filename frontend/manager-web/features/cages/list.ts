import type { Cage, CageOccupant } from "@/lib/api/types";
import { formatShortDate, formatTime } from "@/lib/format";
import { getStoreDateKey } from "@/lib/time";

export type CagesTab = "cages" | "pricing";

export const CAGES_TABS: { value: CagesTab; label: string }[] = [
  { value: "cages", label: "Chuồng" },
  { value: "pricing", label: "Giá lưu trú và phí trả muộn" },
];

// Giá trị lạ hoặc thiếu trên URL coi như tab Chuồng.
export function parseCagesTab(value: string | null): CagesTab {
  return CAGES_TABS.find((tab) => tab.value === value)?.value ?? "cages";
}

export type CageStatus = "Empty" | "Occupied" | "Inactive";

export const CAGE_STATUS_LABELS: Record<CageStatus, string> = {
  Empty: "Trống",
  Occupied: "Đang chứa",
  Inactive: "Ngừng sử dụng",
};

// Chuồng ngừng sử dụng luôn là “Ngừng sử dụng”; chuồng đang sử dụng là “Đang chứa” khi có thú cưng (occupant), ngược lại “Trống”.
export function getCageStatus(cage: Cage): CageStatus {
  if (!cage.isActive) return "Inactive";
  return cage.occupant ? "Occupied" : "Empty";
}

// 4 thẻ số liệu (UI-Screens MW-07 vùng 3). Sức chứa = số chuồng đang sử dụng; chuồng ngừng sử dụng không tính vào
// sức chứa, đang chứa hay trống. `total` là số trên tab Chuồng (gồm cả chuồng ngừng sử dụng).
export function summarizeCages(cages: Cage[]) {
  const active = cages.filter((cage) => cage.isActive);
  const occupied = active.filter((cage) => cage.occupant);
  return {
    total: cages.length,
    capacity: active.length,
    occupied: occupied.length,
    occupiedCodes: occupied.map((cage) => cage.code),
    empty: active.length - occupied.length,
    inactive: cages.length - active.length,
  };
}

// “Chủ: Trương Hoài Nam. Trả 17:00 07/10” hoặc “Chủ: Nguyễn Hải Yến. Trả 18:00 hôm nay” (UI demo MW-07).
// `now` là thời điểm hiện tại dạng ISO 8601, truyền từ ngoài để hàm không đọc đồng hồ khi render.
export function describeOccupant(occupant: CageOccupant, now: string): string {
  const sameDay = getStoreDateKey(occupant.plannedCheckOut) === getStoreDateKey(now);
  const when = sameDay ? "hôm nay" : formatShortDate(occupant.plannedCheckOut);
  return `Chủ: ${occupant.customerName}. Trả ${formatTime(occupant.plannedCheckOut)} ${when}`;
}
