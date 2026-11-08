import type { UseFormRegisterReturn } from "react-hook-form";
import { Field } from "@/components/ui/field";

const weightInputClass =
  "h-[52px] w-full rounded-[10px] border border-line bg-white pl-3 pr-10 text-xl font-bold text-ink transition-colors tabular-nums " +
  "hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)] focus:outline-none " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger aria-[invalid=true]:focus:border-danger " +
  "aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(179,55,43,0.15)] " +
  "disabled:cursor-not-allowed disabled:bg-[#EEF3F4] disabled:text-[#8FA2A7]";

type WeightFieldProps = {
  id: string;
  registration?: UseFormRegisterReturn;
  readOnlyValue?: string;
  error?: string;
};

export function WeightField({ id, registration, readOnlyValue, error }: WeightFieldProps) {
  const isReadOnly = registration === undefined;

  return (
    <div className="w-[260px] max-[640px]:w-full">
      <Field id={id} label="Cân nặng thực tế (kg)" required={!isReadOnly} error={error}>
        {(control) => (
          <div className="relative">
            {isReadOnly ? (
              <input {...control} type="text" readOnly disabled value={readOnlyValue ?? ""} className={weightInputClass} />
            ) : (
              <input
                {...control}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className={weightInputClass}
                {...registration}
              />
            )}
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              kg
            </span>
          </div>
        )}
      </Field>
    </div>
  );
}

