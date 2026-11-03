"use client";

import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Staff, StaffCreateRequest, StaffUpdateRequest } from "@/lib/api/types";
import {
  createStaffFormValues,
  toStaffCreateRequest,
  toStaffUpdateRequest,
  validateFullName,
  validatePassword,
  validatePhone,
  validateStaffRole,
  type StaffFormValues,
} from "../forms";
import { StaffRoleField } from "./staff-role-field";

type StaffFormProps = {
  // Có staff → sửa; không có → thêm mới.
  staff?: Staff;
  onCreate: (request: StaffCreateRequest) => void;
  onUpdate: (request: StaffUpdateRequest) => void;
  onCancel: () => void;
};

// MW-08·D1 – nội dung ngăn kéo thêm/sửa nhân viên (đặt trong <Drawer size="narrow">).
export function StaffForm({ staff, onCreate, onUpdate, onCancel }: StaffFormProps) {
  const id = useId();
  const isEdit = staff !== undefined;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffFormValues>({
    defaultValues: createStaffFormValues(staff),
    mode: "onTouched",
  });

  const fullNameId = `${id}-full-name`;
  const phoneId = `${id}-phone`;
  const passwordId = `${id}-password`;

  function submit(values: StaffFormValues) {
    if (isEdit) onUpdate(toStaffUpdateRequest(values));
    else onCreate(toStaffCreateRequest(values));
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="flex min-h-0 grow flex-col">
      <div className="flex grow flex-col gap-5 overflow-y-auto px-6 py-5">
        <Field id={fullNameId} label="Họ tên" required error={errors.fullName?.message}>
          <Input
            id={fullNameId}
            autoComplete="off"
            aria-required="true"
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={describedBy(fullNameId, { hasError: Boolean(errors.fullName) })}
            {...register("fullName", { validate: validateFullName })}
          />
        </Field>

        <Field id={phoneId} label="Số điện thoại" required hint="Dùng làm tên đăng nhập." error={errors.phone?.message}>
          <Input
            id={phoneId}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            // Số điện thoại là tên đăng nhập, chỉ nhập khi tạo; sửa thì chỉ đọc (UI-Screens MW-08·D1).
            readOnly={isEdit}
            aria-required="true"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy(phoneId, { hasHint: true, hasError: Boolean(errors.phone) })}
            {...register("phone", { validate: isEdit ? undefined : validatePhone })}
          />
        </Field>

        <Controller
          control={control}
          name="staffRole"
          rules={{ validate: validateStaffRole }}
          render={({ field, fieldState }) => (
            <StaffRoleField value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
          )}
        />

        {!isEdit && (
          <Field
            id={passwordId}
            label="Mật khẩu ban đầu"
            required
            hint="Nhân viên dùng để đăng nhập web nhân viên lần đầu."
            error={errors.password?.message}
          >
            <Input
              id={passwordId}
              type="password"
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={describedBy(passwordId, { hasHint: true, hasError: Boolean(errors.password) })}
              {...register("password", { validate: validatePassword })}
            />
          </Field>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onCancel}>Hủy bỏ</Button>
        <Button type="submit">{isEdit ? "Lưu thay đổi" : "Tạo tài khoản"}</Button>
      </div>
    </form>
  );
}
