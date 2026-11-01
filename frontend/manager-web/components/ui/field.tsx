import type { ReactNode } from "react";
import { FieldError } from "@/components/feedback/field-error";

type FieldProps = {
  // id của ô nhập; gợi ý và lỗi dùng `${id}-hint`, `${id}-error`.
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

// Giá trị cho `aria-describedby` của ô nhập đặt trong <Field>.
export function describedBy(id: string, { hasHint, hasError }: { hasHint?: boolean; hasError?: boolean }) {
  const ids = [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function Field({ id, label, required, hint, error, className = "", children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold leading-[18px]">
        {label}
        {required && <span aria-hidden="true" className="text-danger">*</span>}
      </label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
