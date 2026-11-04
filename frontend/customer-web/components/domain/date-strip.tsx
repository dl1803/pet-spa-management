import { formatShortDate, formatWeekdayShort } from "@/lib/format";

type DateStripProps = {
  label: string;
  /** Các ngày dạng YYYY-MM-DD theo múi giờ cửa hàng, theo thứ tự hiển thị. */
  dates: readonly string[];
  value: string;
  onChange: (date: string) => void;
};

export function DateStrip({ label, dates, value, onChange }: DateStripProps) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {dates.map((date) => {
        const isSelected = date === value;

        return (
          <button
            key={date}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(date)}
            className={`w-[78px] flex-none cursor-pointer rounded-xl border py-2.5 text-center ${
              isSelected ? "border-lagoon bg-lagoon text-white" : "border-line bg-white text-ink hover:border-[#A9C6CB]"
            }`}
          >
            <span className={`block text-xs leading-4 ${isSelected ? "text-lagoon-50" : "text-muted"}`}>{formatWeekdayShort(date)}</span>
            <span className="block text-[17px] font-bold leading-6 tabular-nums">{formatShortDate(date)}</span>
          </button>
        );
      })}
    </div>
  );
}

