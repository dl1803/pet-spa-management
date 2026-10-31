"use client";

import { useId } from "react";
import { FieldError } from "@/components/feedback/field-error";
import { StaffOption } from "@/components/domain/staff-option";
import type { SpaSuggestions } from "@/lib/api/types";
import { buildStaffChoices, isStaffSelectionComplete, toggleStaffId } from "../staff-selection";

type StaffAssignmentPanelProps = {
  suggestions: SpaSuggestions;
  selectedStaffIds: string[];
  onSelectedStaffIdsChange: (staffIds: string[]) => void;
};

// MW-04 vùng 5 – Nhân viên spa phụ trách (UI-Screens.md). Chưa có giờ ca, giờ rảnh, người trùng lịch
// vì API chưa trả (UI-Screens G-08): chỉ hiện tên và số lịch gần đây.
export function StaffAssignmentPanel({ suggestions, selectedStaffIds, onSelectedStaffIdsChange }: StaffAssignmentPanelProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const errorId = `${id}-error`;
  const { staffRequired } = suggestions;
  const choices = buildStaffChoices(suggestions);
  const isComplete = isStaffSelectionComplete(selectedStaffIds, staffRequired);

  function handleSelect(staffId: string) {
    onSelectedStaffIdsChange(toggleStaffId(selectedStaffIds, staffId, staffRequired));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 id={titleId}>Nhân viên spa phụ trách, cần {staffRequired} người</h3>
        <span aria-live="polite" className="shrink-0 text-xs text-muted tabular-nums">
          Đã chọn {selectedStaffIds.length} / {staffRequired}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted">
        Hệ thống đề xuất theo thứ tự: có ca làm phủ khung giờ, đang rảnh, ít lịch nhất trong 30 ngày qua.
        Bạn có thể đổi người khác.
      </p>
      {choices.length === 0 && (
        <p className="text-sm text-muted">Chưa có nhân viên phù hợp để chọn cho lịch này.</p>
      )}
      {choices.length > 0 && (
        <div
          role={staffRequired === 1 ? "radiogroup" : "group"}
          aria-labelledby={titleId}
          aria-describedby={isComplete ? undefined : errorId}
          className="flex flex-col gap-2"
        >
          {choices.map(({ staff, isSuggested }) => (
            <StaffOption
              key={staff.staffId}
              staff={staff}
              isSuggested={isSuggested}
              type={staffRequired === 1 ? "radio" : "checkbox"}
              name={id}
              isSelected={selectedStaffIds.includes(staff.staffId)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
      {!isComplete && <FieldError id={errorId} message={`Lịch này cần đúng ${staffRequired} nhân viên.`} />}
    </div>
  );
}
