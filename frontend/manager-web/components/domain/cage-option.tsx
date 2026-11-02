import { Tag } from "@/components/ui/tag";
import type { Cage } from "@/lib/api/types";

type CageOptionProps = {
  cage: Cage;
  // Dòng mô tả dưới mã chuồng.
  detail: string;
  isSuggested: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  name: string;
  onSelect: (cageId: string) => void;
};

// Ô chọn chuồng (MW-04 vùng 8). Dùng input radio thật ẩn bên trong để chọn được bằng bàn phím (Design-System 7).
export function CageOption({ cage, detail, isSuggested, isSelected, isDisabled, name, onSelect }: CageOptionProps) {
  const stateClass = isDisabled
    ? "cursor-not-allowed border-line-soft bg-mist opacity-60"
    : isSelected
      ? "cursor-pointer border-lagoon bg-lagoon-25 shadow-[inset_0_0_0_1px_var(--color-lagoon)]"
      : "cursor-pointer border-line bg-white hover:border-lagoon/50";

  return (
    <label
      className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lagoon/40 ${stateClass}`}
    >
      <input
        type="radio"
        name={name}
        value={cage.cageId}
        checked={isSelected}
        disabled={isDisabled}
        onChange={() => onSelect(cage.cageId)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] bg-white ${isSelected ? "border-lagoon" : "border-muted"}`}
      >
        {isSelected && <span className="size-[9px] rounded-full bg-lagoon" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold break-words">{cage.code}</span>
          {isSuggested && <Tag tone="suggest">Hệ thống đề xuất</Tag>}
        </span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
    </label>
  );
}
