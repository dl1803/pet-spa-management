import type { UseFormRegisterReturn } from "react-hook-form";
import { Field } from "@/components/ui/field";

const moneyInputClass =
  "h-11 w-full rounded-[10px] border border-line bg-white pl-3 pr-8 text-sm text-ink transition-colors tabular-nums " +
  "hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)] focus:outline-none " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger aria-[invalid=true]:focus:border-danger " +
  "aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(179,55,43,0.15)]";

type MoneyFieldProps = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
};

// Ô nhập số tiền (VND) có hậu tố “đ”.
export function MoneyField({ id, label, registration, error }: MoneyFieldProps) {
  return (
    <Field id={id} label={label} required error={error}>
      {(control) => (
        <div className="relative">
          <input
            {...control}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={moneyInputClass}
            {...registration}
          />
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            đ
          </span>
        </div>
      )}
    </Field>
  );
}
