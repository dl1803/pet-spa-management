import type { SpaSuggestions, StaffSuggestion } from "@/lib/api/types";

export type StaffChoice = {
  staff: StaffSuggestion;
  isSuggested: boolean;
};

// Người hệ thống đề xuất đứng trước, người thay thế đứng sau; trùng staffId chỉ giữ lần đầu.
export function buildStaffChoices({ suggested, alternatives }: SpaSuggestions): StaffChoice[] {
  const choices = [
    ...suggested.map((staff) => ({ staff, isSuggested: true })),
    ...alternatives.map((staff) => ({ staff, isSuggested: false })),
  ];
  return choices.filter(
    (choice, index) => choices.findIndex((other) => other.staff.staffId === choice.staff.staffId) === index,
  );
}

// Chọn sẵn người được đề xuất, không quá số người cần (UI-Screens MW-04, mục Hành vi).
export function getInitialStaffIds({ staffRequired, suggested }: SpaSuggestions): string[] {
  return [...new Set(suggested.map((staff) => staff.staffId))].slice(0, staffRequired);
}

// Cần 1 người: chọn người khác thì thay người đang chọn (radio).
// Cần 2 người: bấm để chọn hoặc bỏ chọn (ô kiểm), không chặn ở đây như UI demo;
// số người chưa đúng được báo bằng isStaffSelectionComplete.
export function toggleStaffId(selectedStaffIds: string[], staffId: string, staffRequired: 1 | 2): string[] {
  if (staffRequired === 1) return [staffId];
  return selectedStaffIds.includes(staffId)
    ? selectedStaffIds.filter((id) => id !== staffId)
    : [...selectedStaffIds, staffId];
}

export function isStaffSelectionComplete(selectedStaffIds: string[], staffRequired: 1 | 2): boolean {
  return selectedStaffIds.length === staffRequired;
}
