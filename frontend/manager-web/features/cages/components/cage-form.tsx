"use client";

import { useId, useRef, useState, type ChangeEvent, type RefObject, type SubmitEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toApiError } from "@/lib/api/errors";
import type { Cage, CageCreateRequest } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import {
  FORM_MESSAGES,
  SPECIES_ORDER,
  createCageFormValues,
  getSizeGroupOptions,
  isSpecies,
  resolveSizeGroup,
  toCageRequest,
  validateCode,
  validateSizeGroup,
  validateSpecies,
  type CageFormValues,
} from "../forms";

type CageFormProps = {
  // Có cage → sửa; không có → thêm mới.
  cage?: Cage;
  // Có thể ném (hoặc từ chối Promise) ApiError: 409 DUPLICATE_CAGE_CODE hiện dưới ô mã chuồng, lỗi khác hiện ở đầu form.
  onSubmit: (request: CageCreateRequest) => void | Promise<void>;
  onClose: () => void;
  fallbackFocusRef: RefObject<HTMLElement | null>;
};

// MW-07·D1 – Hộp thoại thêm/sửa chuồng (UI-Screens.md). Chỉ gửi { code, species, sizeGroup }; sức chứa do backend tính.
export function CageForm({ cage, onSubmit, onClose, fallbackFocusRef }: CageFormProps) {
  const id = useId();
  const isEdit = cage !== undefined;
  const submitting = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CageFormValues>({
    defaultValues: createCageFormValues(cage),
    mode: "onTouched",
  });

  // Lỗi gửi không gắn với một ô (Frontend-Conventions 4.1, 5.1): hiện bằng ErrorAlert đầu form.
  const [submitError, setSubmitError] = useState<unknown>(null);

  const species = useWatch({ control, name: "species" });
  const codeId = `${id}-code`;
  const speciesId = `${id}-species`;
  const sizeGroupId = `${id}-size-group`;

  async function submit(values: CageFormValues) {
    setSubmitError(null);
    try {
      await onSubmit(toCageRequest(values));
    } catch (error) {
      // Giữ nguyên dữ liệu đã nhập (Frontend-Conventions 4.1).
      if (toApiError(error).code === "DUPLICATE_CAGE_CODE") {
        setError("code", { type: "server", message: FORM_MESSAGES.codeDuplicate }, { shouldFocus: true });
      } else {
        setSubmitError(error);
      }
    }
  }

  async function submitForm(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // Khóa trước khi xác thực để chặn cả lần gửi đến trước khi nút kịp bị vô hiệu hóa.
    if (submitting.current) return;
    submitting.current = true;
    try {
      await handleSubmit(submit)(event);
    } finally {
      submitting.current = false;
    }
  }

  function close() {
    if (!submitting.current) onClose();
  }

  // Đổi loài làm nhóm đang chọn không còn thuộc loài đó (ví dụ Vừa của chuột lang) thì bỏ chọn để người dùng chọn lại.
  function handleSpeciesChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (isSpecies(next)) setValue("sizeGroup", resolveSizeGroup(next, getValues("sizeGroup")));
  }

  return (
    <Modal
      icon="grid"
      title={isEdit ? "Sửa chuồng" : "Thêm chuồng"}
      description={isEdit ? "Cập nhật mã, loài hoặc nhóm kích cỡ của chuồng." : "Chuồng mới tính ngay vào sức chứa lưu trú."}
      onClose={close}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form noValidate onSubmit={submitForm}>
        <div className="flex flex-col gap-4 px-6 py-5">
          <ErrorAlert error={submitError} />

          <Field id={codeId} label="Mã chuồng" required error={errors.code?.message}>
            <Input
              id={codeId}
              autoComplete="off"
              aria-required="true"
              aria-invalid={errors.code ? true : undefined}
              aria-describedby={describedBy(codeId, { hasError: Boolean(errors.code) })}
              {...register("code", { validate: validateCode })}
            />
          </Field>

          <div className="grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1">
            <Field id={speciesId} label="Loài" required error={errors.species?.message}>
              <Select
                id={speciesId}
                aria-required="true"
                aria-invalid={errors.species ? true : undefined}
                aria-describedby={describedBy(speciesId, { hasError: Boolean(errors.species) })}
                {...register("species", { validate: validateSpecies, onChange: handleSpeciesChange })}
              >
                <option value="" disabled>Chọn loài</option>
                {SPECIES_ORDER.map((item) => (
                  <option key={item} value={item}>{SPECIES_LABELS[item]}</option>
                ))}
              </Select>
            </Field>

            <Field id={sizeGroupId} label="Nhóm kích cỡ" required error={errors.sizeGroup?.message}>
              <Select
                id={sizeGroupId}
                aria-required="true"
                aria-invalid={errors.sizeGroup ? true : undefined}
                aria-describedby={describedBy(sizeGroupId, { hasError: Boolean(errors.sizeGroup) })}
                {...register("sizeGroup", { validate: validateSizeGroup })}
              >
                <option value="" disabled>Chọn nhóm kích cỡ</option>
                {getSizeGroupOptions(species).map((item) => (
                  <option key={item} value={item}>{SIZE_GROUP_LABELS[item]}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-6 pb-6">
          <Button variant="ghost" data-initial-focus disabled={isSubmitting} onClick={close}>Hủy bỏ</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang gửi…" : "Lưu chuồng"}</Button>
        </div>
      </form>
    </Modal>
  );
}
