type TabItem<T extends string> = {
  value: T;
  label: string;
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
            className={`-mb-px inline-flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3.5 text-sm ${
              isActive ? "border-lagoon font-semibold text-lagoon-700" : "border-transparent font-medium text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

