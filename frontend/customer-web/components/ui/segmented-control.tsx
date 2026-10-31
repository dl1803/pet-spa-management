import type { ReactNode } from "react";

type SegmentedItem = {
  value: string;
  label: ReactNode;
};

type SegmentedControlProps = {
  label: string;
  items: SegmentedItem[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedControl({ label, items, value, onChange }: SegmentedControlProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-line bg-mist p-[3px] max-sm:w-full"
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(item.value)}
            className={`inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-[9px] px-3.5 py-[7px] text-sm ${
              isActive
                ? "bg-white font-semibold text-lagoon-700 shadow-[0_1px_3px_rgba(20,50,58,0.12)]"
                : "font-medium text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

