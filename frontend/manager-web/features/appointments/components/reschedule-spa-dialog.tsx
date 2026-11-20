"use client";

import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { StaffOption } from "@/components/domain/staff-option";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { AppointmentDetail } from "@/lib/api/types";
import { formatAppointmentCode, formatTime } from "@/lib/format";
import { useUpdateAppointment } from "@/lib/queries/appointments";
import { useStaffList } from "@/lib/queries/staff";
import { SLOT_TIMES } from "@/lib/slot-times";
import { getStoreDateKey } from "@/lib/time";
import {
  RESCHEDULE_MESSAGES,
  buildSpaUpdateRequest,
  createSpaRescheduleValues,
  isStaffSelectionComplete,
  toggleStaffId,
  validateSpaDate,
  validateSpaSlotInFuture,
  validateSpaTime,
  type SpaRescheduleValues,
} from "../forms";
import { classifyRescheduleError } from "../intervention-error";

type RescheduleSpaDialogProps = {
  appointment: AppointmentDetail;
  onClose: () => void;
  fallbackFocusRef: RefObject<HTMLElement | null>;
};

export function RescheduleSpaDialog({ appointment, onClose, fallbackFocusRef }: RescheduleSpaDialogProps) {
  const id = useId();
  const dateId = `${id}-date`;
  const timeId = `${id}-time`;
  const staffGroupId = `${id}-staff`;

  const submitting = useRef(false);
  const { showSuccess, showError } = useToast();
  const updateMutation = useUpdateAppointment();

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [isConfirmingOutOfShift, setIsConfirmingOutOfShift] = useState(false);
  const [outOfShiftConfirm, setOutOfShiftConfirm] = useState<{
    detail: string | null;
    values: SpaRescheduleValues;
  } | null>(null);

  const staffRequired: 1 | 2 = appointment.staffRequired === 2 ? 2 : 1;
  const isConfirmed = appointment.status === "Confirmed";

  const { data: staffData, isPending: isStaffPending, error: staffError, refetch: refetchStaff } = useStaffList({
    enabled: isConfirmed,
  });
  const availableStaff = (staffData?.items ?? []).filter((s) => s.staffRole === "SpaStaff" && s.isActive);

  const currentTime = appointment.slotStart ? formatTime(appointment.slotStart) : "";

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SpaRescheduleValues>({
    defaultValues: createSpaRescheduleValues(appointment),
    mode: "onTouched",
  });

  const selectedStaffIds = useWatch({ control, name: "staffIds" }) ?? [];

  async function doUpdate(values: SpaRescheduleValues, confirmOutOfShift?: boolean) {
    if (submitting.current) return;
    submitting.current = true;
    setAlertMessage(null);
    setSubmitError(null);
    try {
      const request = buildSpaUpdateRequest(appointment, values, confirmOutOfShift);
      await updateMutation.mutateAsync({ appointmentId: appointment.appointmentId, request });
      showSuccess(`Đã đổi lịch hẹn ${formatAppointmentCode(appointment.appointmentId)}.`);
      onClose();
    } catch (error) {
      const failure = classifyRescheduleError(error, staffRequired);
      if (failure.kind === "out-of-shift") {
        setOutOfShiftConfirm({ detail: failure.detail, values });
      } else if (failure.kind === "stale") {
        showError(failure.error);
        onClose();
      } else if (failure.kind === "field") {
        setError(failure.field, { type: "server", message: failure.message }, { shouldFocus: true });
      } else if (failure.kind === "alert") {
        setAlertMessage(failure.message);
      } else {
        setSubmitError(failure.error);
      }
    } finally {
      submitting.current = false;
    }
  }

  async function submit(values: SpaRescheduleValues) {
    if (isConfirmed && !isStaffSelectionComplete(values.staffIds, staffRequired)) {
      setError("staffIds", { type: "manual", message: RESCHEDULE_MESSAGES.staffCount(staffRequired) }, { shouldFocus: true });
      return;
    }
    await doUpdate(values);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || isConfirmingOutOfShift) return;
    await handleSubmit(submit)(event);
  }

  function close() {
    if (!submitting.current && !isSubmitting && !isConfirmingOutOfShift) onClose();
  }

  return (
    <>
      <Modal
        icon="calendar"
        title={`Đổi lịch spa ${formatAppointmentCode(appointment.appointmentId)}`}
        description="Dùng khi khách gọi hotline ngoài thời hạn tự đổi, hoặc cửa hàng cần điều chỉnh."
        onClose={close}
        fallbackFocusRef={fallbackFocusRef}
      >
        <form noValidate onSubmit={submitForm}>
          <div className="flex flex-col gap-4 px-6 py-5">
            {alertMessage && <Alert tone="danger">{alertMessage}</Alert>}
            <ErrorAlert error={submitError} />

            <div className="grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1">
              <Field id={dateId} label="Ngày" required error={errors.date?.message}>
                <Input
                  id={dateId}
                  type="date"
                  min={getStoreDateKey(new Date())}
                  aria-required="true"
                  aria-invalid={errors.date ? true : undefined}
                  aria-describedby={describedBy(dateId, { hasError: Boolean(errors.date) })}
                  {...register("date", {
                    validate: (val) => {
                      const err = validateSpaDate(val);
                      if (err) return err;
                      const time = getValues("time");
                      return validateSpaSlotInFuture(val, time) ?? true;
                    },
                  })}
                />
              </Field>

              <Field
                id={timeId}
                label="Mốc giờ"
                required
                hint="Hệ thống kiểm tra lại mốc giờ còn chỗ và lịch của nhân viên khi lưu."
                error={errors.time?.message}
              >
                <Select
                  id={timeId}
                  aria-required="true"
                  aria-invalid={errors.time ? true : undefined}
                  aria-describedby={describedBy(timeId, { hasHint: true, hasError: Boolean(errors.time) })}
                  {...register("time", {
                    validate: (val) => {
                      const err = validateSpaTime(val);
                      if (err) return err;
                      const date = getValues("date");
                      return validateSpaSlotInFuture(date, val) ?? true;
                    },
                  })}
                >
                  <option value="" disabled>
                    Chọn mốc giờ
                  </option>
                  {SLOT_TIMES.map((slot) => {
                    const isCurrent = slot === currentTime;
                    return (
                      <option key={slot} value={slot}>
                        {isCurrent ? `${slot} (giữ nguyên)` : slot}
                      </option>
                    );
                  })}
                </Select>
              </Field>
            </div>

            {isConfirmed && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold leading-[18px]">
                  <span>Nhân viên spa phụ trách, cần {staffRequired} người</span>
                  <span className="text-xs font-normal text-muted">
                    Đã chọn {selectedStaffIds.length} / {staffRequired}
                  </span>
                </legend>
                {isStaffPending && (
                  <p role="status" aria-busy="true" className="text-muted">
                    Đang tải danh sách nhân viên…
                  </p>
                )}
                {staffError && (
                  <div className="flex flex-col items-start gap-2">
                    <ErrorAlert error={staffError} />
                    <Button variant="secondary" onClick={() => void refetchStaff()}>
                      Thử lại
                    </Button>
                  </div>
                )}
                {!isStaffPending && !staffError && (
                  <div className="flex flex-col gap-2">
                    {availableStaff.map((staff) => (
                      <StaffOption
                        key={staff.staffId}
                        staff={{ staffId: staff.staffId, fullName: staff.fullName }}
                        isSuggested={false}
                        type={staffRequired === 1 ? "radio" : "checkbox"}
                        name={staffGroupId}
                        isSelected={selectedStaffIds.includes(staff.staffId)}
                        onSelect={(staffId) => {
                          const next = toggleStaffId(selectedStaffIds, staffId, staffRequired);
                          setValue("staffIds", next, { shouldValidate: true });
                        }}
                      />
                    ))}
                  </div>
                )}
                {errors.staffIds?.message && (
                  <FieldError id={`${staffGroupId}-error`} message={errors.staffIds.message} />
                )}
              </fieldset>
            )}
          </div>

          <div className="flex justify-end gap-2.5 px-6 pb-6">
            <Button variant="ghost" data-initial-focus disabled={isSubmitting || isConfirmingOutOfShift} onClick={close}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isConfirmingOutOfShift || (isConfirmed && isStaffPending)}
              aria-busy={isSubmitting || isConfirmingOutOfShift ? "true" : undefined}
            >
              {isSubmitting || isConfirmingOutOfShift ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </Modal>

      {outOfShiftConfirm && (
        <ConfirmDialog
          icon="alert"
          title="Nhân viên ngoài ca làm"
          description="Nhân viên này nằm ngoài ca làm, bạn vẫn muốn chọn?"
          confirmLabel={isConfirmingOutOfShift ? "Đang lưu…" : "Vẫn xác nhận"}
          cancelLabel="Chọn lại"
          disabled={isConfirmingOutOfShift}
          onConfirm={async () => {
            if (isConfirmingOutOfShift || submitting.current) return;
            setIsConfirmingOutOfShift(true);
            const { values } = outOfShiftConfirm;
            try {
              await doUpdate(values, true);
            } finally {
              setIsConfirmingOutOfShift(false);
              setOutOfShiftConfirm(null);
            }
          }}
          onCancel={() => {
            if (isConfirmingOutOfShift) return;
            setOutOfShiftConfirm(null);
          }}
        >
          {outOfShiftConfirm.detail && <p className="mt-2 text-sm text-muted">{outOfShiftConfirm.detail}</p>}
        </ConfirmDialog>
      )}
    </>
  );
}
