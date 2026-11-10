import type { UseFormRegisterReturn } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
        <Input {...control} type="text" inputMode="numeric" autoComplete="off" suffix="đ" {...registration} />
      )}
    </Field>
  );
}
