import { useId } from "react";
import { FieldError } from "@/components/feedback/field-error";
import { ChoiceCard } from "@/components/ui/choice-card";
import type { StaffRole } from "@/lib/api/types";
import { STAFF_ROLE_LABELS } from "@/lib/labels";
import { STAFF_ROLE_ORDER } from "../forms";

type StaffRoleFieldProps = {
  value: StaffRole | "";
  onChange: (role: StaffRole) => void;
  error?: string;
};

// Mô tả quyền theo UI demo (MW-08·D1).
const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  Receptionist: "Ghi nhận khách vãng lai, đặt lịch thay, tiếp nhận, trả thú cưng, thu tiền tại quầy",
  SpaStaff: "Thực hiện lịch spa được phân công, chụp ảnh trước và sau",
};

// Chọn vai trò nhân viên (MW-08·D1). Mỗi vai trò là một thẻ chọn; quyền thật do backend kiểm tra.
export function StaffRoleField({ value, onChange, error }: StaffRoleFieldProps) {
  const id = useId();
  const legendId = `${id}-legend`;
  const errorId = `${id}-error`;

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend id={legendId} className="mb-1.5 text-[13px] font-semibold leading-[18px]">
        Vai trò<span aria-hidden="true" className="text-danger">*</span>
      </legend>
      <div role="radiogroup" aria-labelledby={legendId} aria-required="true" aria-invalid={error ? true : undefined} className="flex flex-col gap-2">
        {STAFF_ROLE_ORDER.map((role) => (
          <ChoiceCard key={role} name={`${id}-role`} value={role} checked={value === role} onChange={() => onChange(role)}>
            <span className="min-w-0">
              <span className="block font-semibold">{STAFF_ROLE_LABELS[role]}</span>
              <span className="block text-xs text-muted">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </ChoiceCard>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
