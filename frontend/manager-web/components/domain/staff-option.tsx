import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import type { StaffSuggestion } from "@/lib/api/types";

type StaffOptionProps = {
  staff: StaffSuggestion;
  isSuggested: boolean;
  type: "radio" | "checkbox";
  name: string;
  isSelected: boolean;
  onSelect: (staffId: string) => void;
};

// Ô chọn nhân viên spa (MW-04 vùng 5). Dùng input thật ẩn bên trong để chọn được bằng bàn phím (Design-System 7).
export function StaffOption({ staff, isSuggested, type, name, isSelected, onSelect }: StaffOptionProps) {
  return (
    <label
      className={`grid cursor-pointer grid-cols-[auto_auto_1fr_auto] items-center gap-3.5 rounded-xl border px-4 py-3.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lagoon/40 ${
        isSelected
          ? "border-lagoon bg-lagoon-25 shadow-[inset_0_0_0_1px_var(--color-lagoon)]"
          : "border-line bg-white hover:border-lagoon/50"
      }`}
    >
      <input
        type={type}
        name={name}
        value={staff.staffId}
        checked={isSelected}
        onChange={() => onSelect(staff.staffId)}
        className="sr-only"
      />
      {type === "radio" ? (
        <span
          aria-hidden="true"
          className={`grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] bg-white ${isSelected ? "border-lagoon" : "border-muted"}`}
        >
          {isSelected && <span className="size-[9px] rounded-full bg-lagoon" />}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] text-white ${isSelected ? "border-lagoon bg-lagoon" : "border-muted bg-white"}`}
        >
          {isSelected && <Icon name="check" className="size-3.5" />}
        </span>
      )}
      <Avatar name={staff.fullName} tone="teal" />
      <span className="flex min-w-0 flex-wrap items-center gap-2 font-semibold">
        <span className="break-words">{staff.fullName}</span>
        {isSuggested && <Tag tone="suggest">Hệ thống đề xuất</Tag>}
      </span>
      {staff.recentAssignmentCount !== undefined && (
        <span className="text-right tabular-nums">
          <b className="block text-[17px] leading-6">{staff.recentAssignmentCount}</b>
          <small className="text-xs text-muted">lịch / 30 ngày</small>
        </span>
      )}
    </label>
  );
}
