import type { Cage, HotelSuggestions, SizeGroup, Species } from "@/lib/api/types";
import { formatShortDate, formatTime } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

// Phần của lịch lưu trú dùng để xét chuồng.
export type HotelStay = {
  species: Species;
  sizeGroup: SizeGroup;
  // ISO 8601.
  plannedCheckIn: string;
  plannedCheckOut: string;
};

// size: khác nhóm kích cỡ. occupied: thú cưng đang ở chuồng chưa trả trước giờ nhận của lịch này.
export type CageBlockReason = "size" | "occupied";

export type CageChoice = {
  cage: Cage;
  // true: là chuồng hệ thống đề xuất và chọn được (hiện nhãn “Hệ thống đề xuất”).
  isSuggested: boolean;
  // false: hiện mờ và không chọn được.
  isEligible: boolean;
  blockReason: CageBlockReason | null;
};

function getBlockReason(cage: Cage, { sizeGroup, plannedCheckIn }: HotelStay): CageBlockReason | null {
  if (cage.sizeGroup !== sizeGroup) return "size";
  if (cage.occupant && Date.parse(cage.occupant.plannedCheckOut) > Date.parse(plannedCheckIn)) return "occupied";
  return null;
}

// Danh sách chuồng để chọn, mọi chuồng (kể cả chuồng đề xuất) đều qua cùng một bộ lọc:
// - Không hiển thị: chuồng ngừng sử dụng, chuồng khác loài (UI-Screens MW-04 vùng 8, G-08).
// - Hiện mờ, không chọn được: khác nhóm kích cỡ; còn thú cưng ở đến sau giờ nhận của lịch này (BR-21).
// Thứ tự: chuồng đề xuất, chuồng chọn được, chuồng bị khóa.
// Đây chỉ là gợi ý để Quản lý khỏi chọn nhầm: chuồng không trùng đêm do backend kiểm tra khi xác nhận (CAGE_CONFLICT).
// Không có chuồng đề xuất (cage = null) thì chỉ còn các chuồng trong `cages`.
export function buildCageChoices({ cage: suggested }: HotelSuggestions, cages: Cage[], stay: HotelStay): CageChoice[] {
  const pool = suggested === null ? cages : [suggested, ...cages.filter((cage) => cage.cageId !== suggested.cageId)];
  const visible = pool.filter((cage) => cage.isActive && cage.species === stay.species);
  const choices = visible.map((cage): CageChoice => {
    const blockReason = getBlockReason(cage, stay);
    return {
      cage,
      isSuggested: suggested !== null && cage.cageId === suggested.cageId && blockReason === null,
      isEligible: blockReason === null,
      blockReason,
    };
  });
  return [
    ...choices.filter((choice) => choice.isSuggested),
    ...choices.filter((choice) => !choice.isSuggested && choice.isEligible),
    ...choices.filter((choice) => !choice.isEligible),
  ];
}

// Lựa chọn chuồng của lịch lưu trú thật: chỉ có chuồng backend đề xuất, vì backend chưa có GET /cages (UI-Screens MW-04 vùng 8, G-08)
// nên chưa có chuồng khác để chọn. Không có chuồng đề xuất thì không có lựa chọn nào.
export function buildSuggestedCageChoices(
  suggestions: HotelSuggestions,
  sizeGroup: SizeGroup,
  plannedCheckIn: string,
  plannedCheckOut: string,
): CageChoice[] {
  const { cage } = suggestions;
  if (cage === null) return [];
  return buildCageChoices(suggestions, [], { species: cage.species, sizeGroup, plannedCheckIn, plannedCheckOut });
}

// Chọn sẵn chuồng đứng đầu trong các chuồng chọn được (chuồng đề xuất nếu nó chọn được); rỗng nếu không có chuồng nào.
export function getInitialCageId(choices: CageChoice[]): string {
  return choices.find((choice) => choice.isEligible)?.cage.cageId ?? "";
}

// Chỉ cho xác nhận khi chuồng đang chọn nằm trong các chuồng chọn được.
export function canConfirmCage(choices: CageChoice[], selectedCageId: string): boolean {
  return choices.some((choice) => choice.isEligible && choice.cage.cageId === selectedCageId);
}

// Dòng mô tả dưới mã chuồng, theo UI demo (MW-04 vùng 8).
export function getCageDetail({ cage, isSuggested, blockReason }: CageChoice, nights: number): string {
  const prefix = `${SPECIES_LABELS[cage.species]}, nhóm ${SIZE_GROUP_LABELS[cage.sizeGroup]}.`;
  const { occupant } = cage;
  if (blockReason === "size") return `${prefix} Không phù hợp kích cỡ`;
  if (blockReason === "occupied" && occupant) {
    return `${prefix} Còn thú cưng đến ${formatTime(occupant.plannedCheckOut)} ngày ${formatShortDate(occupant.plannedCheckOut)}`;
  }
  if (isSuggested) return `${prefix} Trống cả ${nights} đêm`;
  if (occupant) return `${prefix} Trống từ ${formatTime(occupant.plannedCheckOut)} ngày ${formatShortDate(occupant.plannedCheckOut)}`;
  return `${prefix} Đang trống`;
}
