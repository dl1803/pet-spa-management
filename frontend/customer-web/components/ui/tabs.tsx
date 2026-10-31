type TabItem<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

type TabsProps<T extends string> = {
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Tabs<T extends string>({ label, items, value, onChange }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none]"
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={`-mb-px inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm ${
              isActive ? "border-lagoon font-semibold text-lagoon-700" : "border-transparent font-medium text-muted hover:text-ink"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-[7px] text-xs leading-[18px] ${
                  isActive ? "bg-lagoon-50 text-lagoon-700" : "bg-line-soft text-muted"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

