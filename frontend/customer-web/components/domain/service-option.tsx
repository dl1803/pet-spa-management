import type { Ref } from "react";
import { Icon } from "@/components/icons";
import type { PricingRow, Service } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

type ServiceOptionProps = {
  service: Service;
  /** Dòng giá đúng loài và nhóm kích cỡ của thú cưng đang chọn. */
  pricing: PricingRow;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ref?: Ref<HTMLInputElement>;
};

export function ServiceOption({ service, pricing, checked, onChange, ref }: ServiceOptionProps) {
  return (
    <label
      className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lagoon/40 ${
        checked ? "border-lagoon bg-lagoon-25 shadow-[inset_0_0_0_1px_var(--color-lagoon)]" : "border-line bg-white"
      }`}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`grid size-5 place-items-center rounded-md border-[1.5px] text-white ${
          checked ? "border-lagoon bg-lagoon" : "border-control bg-white"
        }`}
      >
        {checked && <Icon name="check" className="size-3.5" />}
      </span>
      <div>
        <div className="font-semibold">{service.name}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
          <span>{pricing.durationMinutes} phút</span>
          <span>Nhận đến {service.latestStartTime}</span>
        </div>
      </div>
      <div className="text-right font-bold tabular-nums">{formatMoney(pricing.price)}</div>
    </label>
  );
}

