import type { FormEventHandler, ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { WALK_IN_NOTE } from "@/features/reception-customers/forms";

type WalkInFormProps = {
  fullName: UseFormRegisterReturn;
  phone: UseFormRegisterReturn;
  errors: { fullName?: string; phone?: string };
  // Lỗi chung của lần gửi (không phải lỗi trùng liên hệ).
  submitError: unknown;
  isSubmitting: boolean;
  // Số điện thoại đang nhập đã thuộc khách có sẵn: khóa nút lưu cho tới khi sửa số.
  isDuplicate: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  // Thẻ khách trùng, chỉ có khi isDuplicate.
  duplicate?: ReactNode;
};

// SW-04 vùng 4: ghi nhận khách vãng lai (họ tên, số điện thoại).
export function WalkInForm({
  fullName,
  phone,
  errors,
  submitError,
  isSubmitting,
  isDuplicate,
  onSubmit,
  onCancel,
  duplicate,
}: WalkInFormProps) {
  return (
    <form noValidate onSubmit={onSubmit} className="max-w-[700px]">
      <Card>
        <CardHeader title="Ghi nhận khách vãng lai" />
        <CardBody>
          <div className="flex flex-col gap-4">
            <ErrorAlert error={submitError} />
            <div className="grid grid-cols-2 items-start gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
              <Field id="walk-in-name" label="Họ tên" required error={errors.fullName}>
                {(control) => <Input {...control} autoComplete="off" {...fullName} />}
              </Field>
              <Field id="walk-in-phone" label="Số điện thoại" required error={errors.phone}>
                {(control) => <Input {...control} inputMode="tel" autoComplete="off" {...phone} />}
              </Field>
            </div>
            {isDuplicate && duplicate}
            <p className="text-xs text-muted">{WALK_IN_NOTE}</p>
          </div>
        </CardBody>
        <CardFooter className="items-center justify-between">
          <Button variant="ghost" onClick={onCancel}>
            Hủy bỏ
          </Button>
          <Button type="submit" loading={isSubmitting} loadingText="Đang lưu…" disabled={isDuplicate}>
            Lưu và tạo hồ sơ thú cưng
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

