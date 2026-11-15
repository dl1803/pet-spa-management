import type { Pet, SizeGroup } from "@/lib/api/types";
import { formatWeight, lowerFirst } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";

const HEIGHT_FORMAT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

// “Mochi, mèo Anh lông ngắn, nhóm Vừa” (MW-04 vùng 3). Nhóm kích cỡ lấy từ lịch hẹn (nhóm đã dùng để tính giá).
export function getPetTitle(pet: Pet, sizeGroup: SizeGroup): string {
  return `${pet.name}, ${lowerFirst(SPECIES_LABELS[pet.species])} ${pet.breed}, nhóm ${SIZE_GROUP_LABELS[sizeGroup]}`;
}

export type PetProfileRow = { label: string; value: string };

// Các dòng của khối “Hồ sơ thú cưng”. Chiều cao, ghi chú chỉ hiện khi hồ sơ có giá trị.
export function getPetProfileRows(pet: Pet): PetProfileRow[] {
  const rows: PetProfileRow[] = [{ label: "Cân nặng", value: formatWeight(pet.weightKg) }];
  if (typeof pet.heightCm === "number") rows.push({ label: "Chiều cao vai", value: `${HEIGHT_FORMAT.format(pet.heightCm)} cm` });
  rows.push({ label: "Tính cách", value: TEMPERAMENT_LABELS[pet.temperament] });
  const coatNote = pet.coatNote?.trim();
  if (coatNote) rows.push({ label: "Ghi chú lông", value: coatNote });
  const notes = pet.notes?.trim();
  if (notes) rows.push({ label: "Ghi chú khác", value: notes });
  return rows;
}
