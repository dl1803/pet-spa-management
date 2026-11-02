"use client";

import { useId } from "react";
import { CageOption } from "@/components/domain/cage-option";
import type { SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { getCageDetail, type CageChoice } from "../cage-selection";

type CageAssignmentPanelProps = {
  species: Species;
  sizeGroup: SizeGroup;
  // Số đêm lưu trú của lịch hẹn.
  nights: number;
  // Đã lọc và sắp xếp bởi buildCageChoices.
  choices: CageChoice[];
  selectedCageId: string;
  onSelectedCageIdChange: (cageId: string) => void;
};

// MW-04 vùng 8 – Chuồng (UI-Screens.md). Chuồng đã qua bộ lọc loài, nhóm, giờ trả của thú cưng đang ở (buildCageChoices);
// việc không trùng đêm với lịch khác vẫn do backend kiểm tra khi xác nhận (UI-Screens G-08).
export function CageAssignmentPanel({
  species,
  sizeGroup,
  nights,
  choices,
  selectedCageId,
  onSelectedCageIdChange,
}: CageAssignmentPanelProps) {
  const id = useId();
  const titleId = `${id}-title`;

  return (
    <div>
      <h3 id={titleId} className="mb-2">Chuồng</h3>
      <p className="mb-3 text-xs text-muted">
        Chuồng phù hợp {SPECIES_LABELS[species].toLocaleLowerCase("vi-VN")} nhóm {SIZE_GROUP_LABELS[sizeGroup]}, trống trong cả {nights} đêm.
        Bạn có thể chọn chuồng khác phù hợp.
      </p>
      <div role="radiogroup" aria-labelledby={titleId} className="grid grid-cols-2 gap-2.5 max-[640px]:grid-cols-1">
        {choices.map((choice) => (
          <CageOption
            key={choice.cage.cageId}
            cage={choice.cage}
            detail={getCageDetail(choice, nights)}
            isSuggested={choice.isSuggested}
            isSelected={selectedCageId === choice.cage.cageId}
            isDisabled={!choice.isEligible}
            name={id}
            onSelect={onSelectedCageIdChange}
          />
        ))}
      </div>
    </div>
  );
}
