"use client";

import { useId } from "react";
import { CageOption } from "@/components/domain/cage-option";
import type { Cage, HotelSuggestions, SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { buildCageChoices, getCageDetail } from "../cage-selection";

type CageAssignmentPanelProps = {
  species: Species;
  sizeGroup: SizeGroup;
  // Số đêm lưu trú của lịch hẹn.
  nights: number;
  suggestions: HotelSuggestions;
  cages: Cage[];
  selectedCageId: string;
  onSelectedCageIdChange: (cageId: string) => void;
};

// MW-04 vùng 8 – Chuồng (UI-Screens.md). Chưa có thông tin trống theo đêm của chuồng khác
// vì API chưa trả (UI-Screens G-08): backend kiểm tra khi xác nhận.
export function CageAssignmentPanel({
  species,
  sizeGroup,
  nights,
  suggestions,
  cages,
  selectedCageId,
  onSelectedCageIdChange,
}: CageAssignmentPanelProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const choices = buildCageChoices(suggestions, cages, species, sizeGroup);

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
