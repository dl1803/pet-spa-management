import type { ReactNode } from "react";
import { FieldError } from "@/components/feedback/field-error";

export type FieldControlProps = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  "aria-required": true | undefined;
};

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  // Ghi chú ngắn sau nhãn, ví dụ “(chỉ cần với chó)”.
  note?: string;
  error?: string;
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({ id, label, required = false, optional = false, note, error, children }: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex min-w-0 flex-col">
      <label htmlFor={id} className="mb-1.5 text-[13px] font-semibold leading-[18px]">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
        {optional && <span className="font-normal text-muted"> (không bắt buộc)</span>}
        {note && <span className="font-normal text-muted"> ({note})</span>}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
        "aria-required": required ? true : undefined,
      })}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

