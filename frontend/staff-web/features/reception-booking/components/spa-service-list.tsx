import type { Ref } from "react";
import { FieldError } from "@/components/feedback/field-error";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicableService } from "@/features/reception-booking/spa-forms";
import { formatMoney } from "@/lib/format";

export const SERVICE_ERROR_ID = "reception-spa-service-error";

type ServiceOptionProps = {
  item: ApplicableService;
  checked: boolean;
  onChange: (checked: boolean) => void;
  inputRef?: Ref<HTMLInputElement>;
};

function ServiceOption({ item, checked, onChange, inputRef }: ServiceOptionProps) {
  const { service, pricing } = item;
  return (
    <label
      className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lagoon/40 ${
        checked ? "border-lagoon bg-lagoon-25 shadow-[inset_0_0_0_1px_var(--color-lagoon)]" : "border-line bg-white"
      }`}
    >
      <input
        ref={inputRef}
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
      <div className="min-w-0">
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

type SpaServiceListProps = {
  applicable: ApplicableService[];
  selectedIds: string[];
  onToggle: (serviceId: string, checked: boolean) => void;
  error?: string;
  firstInputRef?: Ref<HTMLInputElement>;
};

export function SpaServiceList({ applicable, selectedIds, onToggle, error, firstInputRef }: SpaServiceListProps) {
  return (
    <fieldset aria-describedby={error ? SERVICE_ERROR_ID : undefined}>
      <legend className="sr-only">Dịch vụ</legend>
      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        {applicable.map((item, index) => (
          <ServiceOption
            key={item.service.serviceId}
            item={item}
            inputRef={index === 0 ? firstInputRef : undefined}
            checked={selectedIds.includes(item.service.serviceId)}
            onChange={(checked) => onToggle(item.service.serviceId, checked)}
          />
        ))}
      </div>
      <FieldError id={SERVICE_ERROR_ID} message={error} />
    </fieldset>
  );
}

export function SpaServiceListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
      <span className="sr-only">Đang tải dịch vụ…</span>
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-[66px] rounded-xl" />
      ))}
    </div>
  );
}
