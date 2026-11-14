"use client";

import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { Service, ServiceRequest } from "@/lib/api/types";
import { SPECIES_LABELS } from "@/lib/labels";
import {
  FORM_MESSAGES,
  NAME_MAX_LENGTH,
  SPECIES_ORDER,
  createFormValues,
  findPricingProblems,
  toServiceRequest,
  type ServiceFormValues,
} from "../forms";
import { PriceGrid } from "./price-grid";
import { SpeciesChips } from "./species-chips";

type ServiceFormProps = {
  // Có service → sửa; không có → thêm mới.
  service?: Service;
  slotTimes: string[];
  onSubmit: (request: ServiceRequest) => void;
  onCancel: () => void;
  // Đang gửi lên server: khóa nút lưu để chống bấm đúp (SA 6.6).
  isSubmitting?: boolean;
  // Lỗi lần gửi gần nhất (400 VALIDATION_ERROR, 404…); form giữ nguyên dữ liệu đã nhập (Frontend-Conventions 4.1).
  submitError?: unknown;
};

// MW-06·D1 – nội dung ngăn kéo thêm/sửa dịch vụ (đặt trong <Drawer>).
export function ServiceForm({ service, slotTimes, onSubmit, onCancel, isSubmitting = false, submitError = null }: ServiceFormProps) {
  const id = useId();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    defaultValues: createFormValues(service),
    mode: "onTouched",
  });

  const species = useWatch({ control, name: "species" });
  const rows = useWatch({ control, name: "rows" });
  const problems = findPricingProblems({ species, rows });

  const nameId = `${id}-name`;
  const descriptionId = `${id}-description`;
  const slotId = `${id}-slot`;
  const speciesErrorId = `${id}-species-error`;
  const slotHint = "Phải là một mốc giờ trong cấu hình.";

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(toServiceRequest(values)))}
      className="flex min-h-0 grow flex-col"
    >
      <div className="flex grow flex-col gap-6 overflow-y-auto px-6 py-5">
        <ErrorAlert error={submitError} />
        {problems.length > 0 && <Alert tone="danger">{problems[0].message}</Alert>}

        <Field id={nameId} label="Tên dịch vụ" required error={errors.name?.message}>
          <Input
            id={nameId}
            autoComplete="off"
            aria-required="true"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy(nameId, { hasError: Boolean(errors.name) })}
            {...register("name", {
              validate: (value) => {
                if (value.trim() === "") return FORM_MESSAGES.nameRequired;
                return value.trim().length <= NAME_MAX_LENGTH || FORM_MESSAGES.nameTooLong;
              },
            })}
          />
        </Field>

        <Field id={descriptionId} label="Mô tả">
          <Textarea id={descriptionId} rows={3} {...register("description")} />
        </Field>

        <div className="grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1">
          <Field id={slotId} label="Mốc bắt đầu muộn nhất" required hint={slotHint} error={errors.latestStartTime?.message}>
            <Select
              id={slotId}
              aria-required="true"
              aria-invalid={errors.latestStartTime ? true : undefined}
              aria-describedby={describedBy(slotId, { hasHint: true, hasError: Boolean(errors.latestStartTime) })}
              {...register("latestStartTime", {
                validate: (value) => slotTimes.includes(value) || FORM_MESSAGES.slotTimeInvalid,
              })}
            >
              <option value="" disabled>Chọn mốc giờ</option>
              {slotTimes.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </Select>
          </Field>

          <Controller
            control={control}
            name="species"
            rules={{ validate: (value) => value.length > 0 || FORM_MESSAGES.speciesRequired }}
            render={({ field, fieldState }) => (
              <SpeciesChips
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                errorId={speciesErrorId}
              />
            )}
          />
        </div>

        {SPECIES_ORDER.filter((item) => species.includes(item)).map((item) => (
          <section key={item} aria-label={`Giá của ${SPECIES_LABELS[item]}`}>
            <h3 className="mb-2 text-[15px]">{SPECIES_LABELS[item]}</h3>
            <PriceGrid species={item} register={register} problems={problems} />
          </section>
        ))}

        <p className="text-xs text-muted">
          Giá, thời lượng mới áp dụng cho các lượt đặt lịch tiếp theo. Số nhân viên là 1 hoặc 2; bé khó tính luôn cần tối thiểu 2.
        </p>
      </div>

      <div className="flex shrink-0 justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>Hủy bỏ</Button>
        <Button type="submit" disabled={problems.length > 0 || isSubmitting} aria-busy={isSubmitting || undefined}>
          {isSubmitting ? "Đang lưu…" : "Lưu dịch vụ"}
        </Button>
      </div>
    </form>
  );
}
