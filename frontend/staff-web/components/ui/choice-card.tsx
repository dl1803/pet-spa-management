import type { ReactNode } from "react";

type ChoiceCardProps = {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
};

export function ChoiceCard({ name, value, checked, onChange, children }: ChoiceCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lagoon/40 ${
        checked
          ? "border-lagoon bg-lagoon-25 shadow-[inset_0_0_0_1px_var(--color-lagoon)]"
          : "border-line bg-white hover:border-[#A9C6CB]"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden="true"
        className={`grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] bg-white ${
          checked ? "border-lagoon" : "border-control"
        }`}
      >
        {checked && <span className="size-[9px] rounded-full bg-lagoon" />}
      </span>
      {children}
    </label>
  );
}

