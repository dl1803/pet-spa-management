import { Skeleton } from "@/components/ui/skeleton";
import type { SlotInfo, SlotStatus } from "@/lib/api/types";

const GROUP_NAMES = ["Sáng", "Trưa", "Chiều, tối"] as const;
type GroupName = (typeof GROUP_NAMES)[number];

// Chia nhóm theo giờ: group của API là chuỗi tự do nên không dùng.
function getGroupName(time: string): GroupName {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "Sáng";
  if (hour < 15) return "Trưa";
  return "Chiều, tối";
}

const SLOT_CLASS: Record<"selected" | SlotStatus, string> = {
  selected: "cursor-pointer border-lagoon bg-lagoon text-white",
  Available: "cursor-pointer border-line bg-white text-ink hover:border-lagoon",
  Full: "cursor-not-allowed border-dashed border-line bg-mist text-muted",
  NotAccepted: "cursor-not-allowed border-apricot-100 bg-apricot-50 text-apricot-700",
};

const GROUP_CLASS =
  "grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-t border-line-soft py-3.5 first-of-type:border-t-0 first-of-type:pt-1 max-[640px]:grid-cols-1 max-[640px]:gap-2";
const GRID_CLASS = "grid grid-cols-5 gap-2 max-[640px]:grid-cols-3";

type SlotPickerProps = {
  /** Tên nhóm cho trình đọc màn hình. */
  legend: string;
  slots: readonly SlotInfo[];
  /** Mốc đang chọn (HH:mm), rỗng khi chưa chọn. */
  value: string;
  onChange: (time: string) => void;
  /** Giờ kết thúc của mốc đang chọn (mốc + thời lượng), hiện dưới giờ. */
  getEndTime: (time: string) => string;
  describedBy?: string;
};

export function SlotPicker({ legend, slots, value, onChange, getEndTime, describedBy }: SlotPickerProps) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="sr-only">{legend}</legend>
      {GROUP_NAMES.map((name) => {
        const groupSlots = slots.filter((slot) => getGroupName(slot.time) === name);
        if (groupSlots.length === 0) return null;

        return (
          <div key={name} className={GROUP_CLASS}>
            <div className="pt-2.5 font-semibold max-[640px]:pt-0">{name}</div>
            <div className={GRID_CLASS}>
              {groupSlots.map((slot) => {
                const isAvailable = slot.status === "Available";
                const isSelected = isAvailable && slot.time === value;
                const note = isSelected
                  ? `kết thúc ${getEndTime(slot.time)}`
                  : slot.status === "Available"
                    ? "còn chỗ"
                    : slot.status === "Full"
                      ? "Đã kín"
                      : "Không nhận";
                const noteClass = isSelected ? "text-lagoon-50" : isAvailable ? "text-muted" : "";

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!isAvailable}
                    aria-pressed={isAvailable ? isSelected : undefined}
                    onClick={() => onChange(slot.time)}
                    className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl border p-1.5 ${
                      SLOT_CLASS[isSelected ? "selected" : slot.status]
                    }`}
                  >
                    <b className={`text-[15px] leading-5 tabular-nums ${slot.status === "Full" ? "line-through" : ""}`}>{slot.time}</b>
                    <small className={`text-[11px] leading-[14px] ${noteClass}`}>{note}</small>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3.5 rounded border border-line bg-white" />
          Còn chỗ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3.5 rounded border border-lagoon bg-lagoon" />
          Đang chọn
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3.5 rounded border border-dashed border-line bg-mist" />
          Đã kín
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3.5 rounded border border-apricot-100 bg-apricot-50" />
          Không nhận dịch vụ đã chọn
        </span>
      </div>
    </fieldset>
  );
}

// Khung xương trong lúc tải mốc giờ: 3 nhóm với 3, 3, 5 mốc.
export function SlotPickerSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Đang tải khung giờ…</span>
      {[3, 3, 5].map((count, groupIndex) => (
        <div key={groupIndex} className={GROUP_CLASS}>
          <Skeleton className="mt-2.5 h-5 w-16 rounded-md max-[640px]:mt-0" />
          <div className={GRID_CLASS}>
            {Array.from({ length: count }, (_, slotIndex) => (
              <Skeleton key={slotIndex} className="h-[58px] rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

