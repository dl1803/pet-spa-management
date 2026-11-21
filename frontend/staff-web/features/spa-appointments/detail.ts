import type { AppointmentStatus, Pet } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";

// SW-03 vùng 1: nút chính của Nhân viên spa. Received/InProgress → mở màn thực hiện; Confirmed → khóa kèm lý do; còn lại không có nút.
export type PrimaryAction = "open" | "locked" | "none";

export const EXECUTION_LOCKED_REASON = "Chờ lễ tân tiếp nhận thú cưng.";

export function getPrimaryAction(status: AppointmentStatus): PrimaryAction {
  if (status === "Received" || status === "InProgress") return "open";
  if (status === "Confirmed") return "locked";
  return "none";
}

export type ProfileRow = { label: string; value: string };

const HEIGHT_FORMAT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

// SW-03 vùng 3: thứ tự và nhãn theo UI-Screens. Trường không có hiện "—".
export function buildProfileRows(pet: Pet): ProfileRow[] {
  return [
    { label: "Loài, giống", value: `${SPECIES_LABELS[pet.species]} ${pet.breed}` },
    { label: "Cân nặng khai báo", value: formatWeight(pet.weightKg) },
    { label: "Chiều cao vai", value: pet.heightCm != null ? `${HEIGHT_FORMAT.format(pet.heightCm)} cm` : "—" },
    { label: "Nhóm kích cỡ", value: SIZE_GROUP_LABELS[pet.sizeGroup] },
    { label: "Tính cách", value: TEMPERAMENT_LABELS[pet.temperament] },
    { label: "Đặc điểm lông", value: pet.coatNote?.trim() || "—" },
    { label: "Ghi chú", value: pet.notes?.trim() || "—" },
  ];
}
