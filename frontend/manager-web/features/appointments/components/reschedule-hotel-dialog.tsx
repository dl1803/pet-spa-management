"use client";

import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { AppointmentDetail } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useUpdateAppointment } from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { usePet } from "@/lib/queries/pets";
import { getStoreDateKey } from "@/lib/time";
import {
  buildHotelUpdateRequest,
  createHotelRescheduleValues,
  validateHotelCheckInDate,
  validateHotelCheckInInFuture,
  validateHotelCheckInTime,
  validateHotelCheckOutAfterCheckIn,
  validateHotelCheckOutDate,
  validateHotelCheckOutTime,
  type HotelRescheduleValues,
} from "../forms";
import { classifyRescheduleError } from "../intervention-error";

type RescheduleHotelDialogProps = {
  appointment: AppointmentDetail;
  onClose: () => void;
  fallbackFocusRef: RefObject<HTMLElement | null>;
};

export function RescheduleHotelDialog({ appointment, onClose, fallbackFocusRef }: RescheduleHotelDialogProps) {
  const id = useId();
  const checkInDateId = `${id}-check-in-date`;
  const checkInTimeId = `${id}-check-in-time`;
  const checkOutDateId = `${id}-check-out-date`;
  const checkOutTimeId = `${id}-check-out-time`;
  const cageIdField = `${id}-cage`;

  const submitting = useRef(false);
  const { showSuccess, showError } = useToast();
  const updateMutation = useUpdateAppointment();

  const isConfirmed = appointment.status === "Confirmed";
  const cagesQuery = useCages({ enabled: isConfirmed });
  const petQuery = usePet(appointment.petId);
  const species = petQuery.data?.species;
  const allCages = cagesQuery.data?.items ?? [];
  const matchingCages = allCages.filter(
    (cage) =>
      cage.isActive &&
      cage.sizeGroup === appointment.sizeGroup &&
      (species === undefined || cage.species === species),
  );
  const currentCage = appointment.cageId
    ? allCages.find((cage) => cage.cageId === appointment.cageId) ?? null
    : null;
  const cageOptions =
    currentCage && !matchingCages.some((cage) => cage.cageId === currentCage.cageId)
      ? [currentCage, ...matchingCages]
      : matchingCages;

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<HotelRescheduleValues>({
    defaultValues: createHotelRescheduleValues(appointment),
    mode: "onTouched",
  });

  async function submit(values: HotelRescheduleValues) {
    setAlertMessage(null);
    setSubmitError(null);
    try {
      const request = buildHotelUpdateRequest(appointment, values);
      await updateMutation.mutateAsync({ appointmentId: appointment.appointmentId, request });
      showSuccess(`Đã đổi lịch hẹn ${formatAppointmentCode(appointment.appointmentId)}.`);
      onClose();
    } catch (error) {
      const failure = classifyRescheduleError(error, 1);
      if (failure.kind === "stale") {
        showError(failure.error);
        onClose();
      } else if (failure.kind === "alert") {
        setAlertMessage(failure.message);
      } else {
        // Mọi loại khác (kể cả field, out-of-shift vốn không xảy ra với lưu trú) -> ErrorAlert đầu form với lỗi gốc
        setSubmitError(error);
      }
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    try {
      await handleSubmit(submit)(event);
    } finally {
      submitting.current = false;
    }
  }

  function close() {
    if (!submitting.current && !isSubmitting) onClose();
  }

  return (
    <Modal
      icon="calendar"
      title={`Đổi lịch lưu trú ${formatAppointmentCode(appointment.appointmentId)}`}
      description="Dùng khi khách gọi hotline ngoài thời hạn tự đổi, hoặc cửa hàng cần điều chỉnh."
      onClose={close}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form noValidate onSubmit={submitForm}>
        <div className="flex flex-col gap-4 px-6 py-5">
          {alertMessage && <Alert tone="danger">{alertMessage}</Alert>}
          <ErrorAlert error={submitError} />

          <p className="text-xs text-muted">
            Chuồng hiện tại được giữ nguyên nếu còn trống trong thời gian mới. Hệ thống kiểm tra lại chỗ trống khi lưu.
          </p>

          <div className="grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1">
            <Field id={checkInDateId} label="Ngày nhận" required error={errors.checkInDate?.message}>
              <Input
                id={checkInDateId}
                type="date"
                min={getStoreDateKey(new Date())}
                aria-required="true"
                aria-invalid={errors.checkInDate ? true : undefined}
                aria-describedby={describedBy(checkInDateId, { hasError: Boolean(errors.checkInDate) })}
                {...register("checkInDate", {
                  deps: ["checkOutDate"],
                  validate: (val) => {
                    const err = validateHotelCheckInDate(val);
                    if (err) return err;
                    const time = getValues("checkInTime");
                    return validateHotelCheckInInFuture(val, time) ?? true;
                  },
                })}
              />
            </Field>

            <Field id={checkInTimeId} label="Giờ nhận" required error={errors.checkInTime?.message}>
              <Input
                id={checkInTimeId}
                type="time"
                aria-required="true"
                aria-invalid={errors.checkInTime ? true : undefined}
                aria-describedby={describedBy(checkInTimeId, { hasError: Boolean(errors.checkInTime) })}
                {...register("checkInTime", {
                  validate: (val) => {
                    const err = validateHotelCheckInTime(val);
                    if (err) return err;
                    const date = getValues("checkInDate");
                    return validateHotelCheckInInFuture(date, val) ?? true;
                  },
                })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1">
            <Field id={checkOutDateId} label="Ngày trả" required error={errors.checkOutDate?.message}>
              <Input
                id={checkOutDateId}
                type="date"
                aria-required="true"
                aria-invalid={errors.checkOutDate ? true : undefined}
                aria-describedby={describedBy(checkOutDateId, { hasError: Boolean(errors.checkOutDate) })}
                {...register("checkOutDate", {
                  validate: (val) => {
                    const err = validateHotelCheckOutDate(val);
                    if (err) return err;
                    const inDate = getValues("checkInDate");
                    return validateHotelCheckOutAfterCheckIn(inDate, val) ?? true;
                  },
                })}
              />
            </Field>

              <Field id={checkOutTimeId} label="Giờ trả" required error={errors.checkOutTime?.message}>
              <Input
                id={checkOutTimeId}
                type="time"
                aria-required="true"
                aria-invalid={errors.checkOutTime ? true : undefined}
                aria-describedby={describedBy(checkOutTimeId, { hasError: Boolean(errors.checkOutTime) })}
                {...register("checkOutTime", {
                  validate: (val) => validateHotelCheckOutTime(val) ?? true,
                })}
              />
            </Field>
          </div>

          {isConfirmed && (
            <div className="flex flex-col gap-2">
              {cagesQuery.isPending && (
                <p role="status" aria-busy="true" className="text-muted">
                  Đang tải danh sách chuồng…
                </p>
              )}
              {cagesQuery.error && (
                <div className="flex flex-col items-start gap-2">
                  <ErrorAlert error={cagesQuery.error} />
                  <Button variant="secondary" onClick={() => void cagesQuery.refetch()}>
                    Thử lại
                  </Button>
                </div>
              )}
              {!cagesQuery.isPending && !cagesQuery.error && (
                <Field
                  id={cageIdField}
                  label="Chuồng"
                  hint="Chỉ hiện chuồng cùng loài và nhóm kích cỡ. Để nguyên nếu giữ chuồng hiện tại."
                  error={errors.cageId?.message}
                >
                  <Select
                    id={cageIdField}
                    aria-invalid={errors.cageId ? true : undefined}
                    aria-describedby={describedBy(cageIdField, { hasHint: true, hasError: Boolean(errors.cageId) })}
                    {...register("cageId")}
                  >
                    {!appointment.cageId && (
                      <option value="">Giữ nguyên chuồng hiện tại</option>
                    )}
                    {appointment.cageId && !currentCage && (
                      <option value={appointment.cageId}>Chuồng hiện tại (giữ nguyên)</option>
                    )}
                    {cageOptions.map((cage) => (
                      <option key={cage.cageId} value={cage.cageId}>
                        {cage.cageId === appointment.cageId ? `${cage.code} (giữ nguyên)` : cage.code}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 px-6 pb-6">
          <Button variant="ghost" data-initial-focus disabled={isSubmitting} onClick={close}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (isConfirmed && cagesQuery.isPending)}
            aria-busy={isSubmitting ? "true" : undefined}
          >
            {isSubmitting ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
