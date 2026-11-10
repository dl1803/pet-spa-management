import type { UseFormRegisterReturn } from "react-hook-form";
import { MoneyField } from "@/features/reception-payments/components/money-field";
import type { CounterFormState } from "@/features/reception-payments/forms";
import { formatMoney } from "@/lib/format";

type CashPanelProps = {
  id: string;
  registration: UseFormRegisterReturn;
  error?: string;
  state: CounterFormState;
};

// Vùng 6: số tiền khách đưa, tiền thối lại (chỉ đọc, tính ở web). Thiếu tiền thì đổi thành “Còn thiếu” chữ đỏ.
export function CashPanel({ id, registration, error, state }: CashPanelProps) {
  const isShort = state.isInsufficient;
  const remainder = isShort ? state.shortfall : state.change;
  return (
    <div className="grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1">
      <MoneyField id={id} label="Số tiền khách đưa" registration={registration} error={error} />
      <div className="flex min-w-0 flex-col">
        <div className="mb-1.5 text-[13px] font-semibold leading-[18px]">{isShort ? "Còn thiếu" : "Tiền thối lại"}</div>
        <div
          aria-live="polite"
          className={`flex h-11 items-center rounded-[10px] bg-mist px-3 text-sm font-semibold tabular-nums ${isShort ? "text-danger" : "text-ink"}`}
        >
          {state.received === null ? "—" : formatMoney(remainder)}
        </div>
      </div>
    </div>
  );
}
