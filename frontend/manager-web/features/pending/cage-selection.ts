import type { Cage, HotelSuggestions, SizeGroup, Species } from "@/lib/api/types";
import { formatShortDate, formatTime } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

export type CageChoice = {
  cage: Cage;
  isSuggested: boolean;
  // false: cùng loài nhưng khác nhóm kích cỡ, hiện mờ và không chọn được.
  isEligible: boolean;
};

// Chuồng hệ thống đề xuất đứng đầu, kế đến chuồng cùng loài và nhóm, cuối cùng chuồng khác nhóm (hiện mờ).
// Lọc ở web: API chỉ đề xuất 1 chuồng (UI-Screens G-08), chuồng khác lấy từ GET /cages theo isActive, loài, nhóm.
// Web không tự kết luận chuồng có trống trong các đêm hay không: backend kiểm tra khi xác nhận.
export function buildCageChoices(
  { cage: suggested }: HotelSuggestions,
  cages: Cage[],
  species: Species,
  sizeGroup: SizeGroup,
): CageChoice[] {
  const others = cages.filter(
    (cage) => cage.cageId !== suggested.cageId && cage.isActive && cage.species === species,
  );
  return [
    { cage: suggested, isSuggested: true, isEligible: true },
    ...others.filter((cage) => cage.sizeGroup === sizeGroup).map((cage) => ({ cage, isSuggested: false, isEligible: true })),
    ...others.filter((cage) => cage.sizeGroup !== sizeGroup).map((cage) => ({ cage, isSuggested: false, isEligible: false })),
  ];
}

// Chọn sẵn chuồng được đề xuất (UI-Screens MW-04, mục Hành vi).
export function getInitialCageId({ cage }: HotelSuggestions): string {
  return cage.cageId;
}

// Dòng mô tả dưới mã chuồng, theo UI demo (MW-04 vùng 8).
export function getCageDetail({ cage, isSuggested, isEligible }: CageChoice, nights: number): string {
  const prefix = `${SPECIES_LABELS[cage.species]}, nhóm ${SIZE_GROUP_LABELS[cage.sizeGroup]}.`;
  if (isSuggested) return `${prefix} Trống cả ${nights} đêm`;
  if (!isEligible) return `${prefix} Không phù hợp kích cỡ`;
  if (cage.occupant) {
    return `${prefix} Trống từ ${formatTime(cage.occupant.plannedCheckOut)} ngày ${formatShortDate(cage.occupant.plannedCheckOut)}`;
  }
  return `${prefix} Đang trống`;
}
