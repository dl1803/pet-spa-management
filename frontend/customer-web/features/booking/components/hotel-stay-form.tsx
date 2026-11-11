import type { ReactNode } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  CHECK_IN_DATE_REQUIRED_MESSAGE,
  CHECK_IN_TIME_REQUIRED_MESSAGE,
  CHECK_OUT_DATE_REQUIRED_MESSAGE,
  CHECK_OUT_TIME_REQUIRED_MESSAGE,
  validateCheckOutDate,
  type HotelBookingFormValues,
} from "@/features/booking/forms";
import { getStoreDateKey } from "@/lib/time";

type HotelStayFormProps = {
  register: UseFormRegister<HotelBookingFormValues>;
  errors: FieldErrors<HotelBookingFormValues>;
  // Lỗi 400 từ lần gửi gần nhất, hiện dưới ô Ngày trả.
  checkOutDateServerError?: string;
  // Đổi ngày nhận thì kiểm tra lại ô Ngày trả.
  onCheckInDateChange: () => void;
  children: ReactNode;
};

export function HotelStayForm({
  register,
  errors,
  checkOutDateServerError,
  onCheckInDateChange,
  children,
}: HotelStayFormProps) {
  const todayKey = getStoreDateKey(new Date());

  return (
    <Card>
      <CardHeader title="Thời gian gửi và đón" />
      <CardBody>
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <Field id="hotel-check-in-date" label="Ngày nhận" required error={errors.checkInDate?.message}>
            {(control) => (
              <Input
                type="date"
                min={todayKey}
                max="9999-12-31"
                {...control}
                {...register("checkInDate", {
                  required: CHECK_IN_DATE_REQUIRED_MESSAGE,
                  onChange: onCheckInDateChange,
                })}
              />
            )}
          </Field>
          <Field id="hotel-check-in-time" label="Giờ nhận" required error={errors.checkInTime?.message}>
            {(control) => (
              <Input type="time" {...control} {...register("checkInTime", { required: CHECK_IN_TIME_REQUIRED_MESSAGE })} />
            )}
          </Field>
          <Field
            id="hotel-check-out-date"
            label="Ngày trả"
            required
            error={errors.checkOutDate?.message ?? checkOutDateServerError}
          >
            {(control) => (
              <Input
                type="date"
                max="9999-12-31"
                {...control}
                {...register("checkOutDate", {
                  required: CHECK_OUT_DATE_REQUIRED_MESSAGE,
                  validate: validateCheckOutDate,
                })}
              />
            )}
          </Field>
          <Field id="hotel-check-out-time" label="Giờ trả" required error={errors.checkOutTime?.message}>
            {(control) => (
              <Input
                type="time"
                {...control}
                {...register("checkOutTime", { required: CHECK_OUT_TIME_REQUIRED_MESSAGE })}
              />
            )}
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted">
          Số đêm tính theo ngày nhận và ngày trả. Cửa hàng giữ chỗ tối đa 15 phút sau giờ nhận.
        </p>
        {children}
      </CardBody>
    </Card>
  );
}

