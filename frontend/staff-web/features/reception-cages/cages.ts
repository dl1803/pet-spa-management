import type { Cage, SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { getStoreDateKey } from "@/lib/time";

export const CAGES_QUERY_KEY = ["cages"] as const;

export type CageState = "empty" | "occupied" | "inactive";
export type SpeciesFilter = "all" | Species;
export type SizeFilter = "all" | SizeGroup;
export type StateFilter = "all" | "empty" | "occupied";

export type CageFilters = { species: SpeciesFilter; size: SizeFilter; state: StateFilter };

export const DEFAULT_CAGE_FILTERS: CageFilters = { species: "all", size: "all", state: "all" };

export const SPECIES_FILTERS: { value: SpeciesFilter; label: string }[] = [
  { value: "all", label: "Tất cả loài" },
  { value: "Dog", label: "Chó" },
  { value: "Cat", label: "Mèo" },
  { value: "Rabbit", label: "Thỏ" },
  { value: "GuineaPig", label: "Chuột lang" },
];

export const STATE_FILTERS: { value: StateFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "empty", label: "Trống" },
  { value: "occupied", label: "Đang chứa" },
];

// Lịch lưu trú đang ở trạng thái InStay, dùng để tìm lịch của thú cưng đang ở trong chuồng.
export type InStayRef = { appointmentId: string; petId: string };

// Chuồng ngừng sử dụng luôn là "inactive", bất kể có thông tin occupant hay không.
export function getCageState(cage: Cage): CageState {
  if (!cage.isActive) return "inactive";
  return cage.occupant != null ? "occupied" : "empty";
}

export function describeCageKind(cage: Cage) {
  return `${SPECIES_LABELS[cage.species]}, nhóm ${SIZE_GROUP_LABELS[cage.sizeGroup]}`;
}

export function sortCages(cages: Cage[]): Cage[] {
  return [...cages].sort((a, b) => a.code.localeCompare(b.code, "vi", { numeric: true }));
}

export type CageCounts = { active: number; occupied: number; empty: number; inactive: number };

export function countCages(cages: Cage[]): CageCounts {
  const counts: CageCounts = { active: 0, occupied: 0, empty: 0, inactive: 0 };
  for (const cage of cages) {
    const state = getCageState(cage);
    if (state === "inactive") {
      counts.inactive += 1;
      continue;
    }
    counts.active += 1;
    if (state === "occupied") counts.occupied += 1;
    else counts.empty += 1;
  }
  return counts;
}

// "11 chuồng đang sử dụng: 3 đang chứa, 8 trống. 1 chuồng ngừng sử dụng." (bỏ câu cuối khi không có chuồng ngừng sử dụng)
export function describeCageCounts({ active, occupied, empty, inactive }: CageCounts) {
  const base = `${active} chuồng đang sử dụng: ${occupied} đang chứa, ${empty} trống.`;
  return inactive > 0 ? `${base} ${inactive} chuồng ngừng sử dụng.` : base;
}

// Chuồng ngừng sử dụng chỉ xuất hiện khi lọc tình trạng "Tất cả".
export function filterCages(cages: Cage[], filters: CageFilters): Cage[] {
  return sortCages(cages).filter((cage) => {
    if (filters.species !== "all" && cage.species !== filters.species) return false;
    if (filters.size !== "all" && cage.sizeGroup !== filters.size) return false;
    const state = getCageState(cage);
    if (filters.state === "empty") return state === "empty";
    if (filters.state === "occupied") return state === "occupied";
    return true;
  });
}

// Chuồng đang chứa thú cưng có giờ trả dự kiến rơi vào ngày todayKey (YYYY-MM-DD, theo múi giờ cửa hàng).
export function isReturnToday(cage: Cage, todayKey: string) {
  if (getCageState(cage) !== "occupied" || cage.occupant == null) return false;
  return getStoreDateKey(cage.occupant.plannedCheckOut) === todayKey;
}

// Tìm lịch lưu trú của thú cưng trong chuồng theo petId; null khi không tìm thấy.
export function findReturnAppointmentId(cage: Cage, refs: InStayRef[]): string | null {
  const petId = cage.occupant?.petId;
  if (!petId) return null;
  return refs.find((ref) => ref.petId === petId)?.appointmentId ?? null;
}
