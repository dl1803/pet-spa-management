import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  HotelAvailabilityNotice,
  type AvailabilityNoticeState,
} from "@/features/reception-booking/components/hotel-availability-notice";
import {
  CHECK_IN_DATE_REQUIRED_MESSAGE,
  CHECK_IN_TIME_REQUIRED_MESSAGE,
  CHECK_OUT_TIME_REQUIRED_MESSAGE,
  validateCheckOutDate,
  type HotelStayFormValues,
} from "@/features/reception-booking/forms";

type HotelStayFormProps = {
  register: UseFormRegister<HotelStayFormValues>;
  errors: FieldErrors<HotelStayFormValues>;
  notice: AvailabilityNoticeState;
  onCheckInDateChange: () => void;
};

export function HotelStayForm({ register, errors, notice, onCheckInDateChange }: HotelStayFormProps) {
  return (
    <Card>
      <CardHeader title="Thời gian gửi và đón" />
      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
            <Field id="hotel-check-in-date" label="Ngày nhận" required error={errors.checkInDate?.message}>
              {(control) => (
                <Input
                  type="date"
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
                <Input
                  type="time"
                  {...control}
                  {...register("checkInTime", { required: CHECK_IN_TIME_REQUIRED_MESSAGE })}
                />
              )}
            </Field>
            <Field id="hotel-check-out-date" label="Ngày trả" required error={errors.checkOutDate?.message}>
              {(control) => (
                <Input
                  type="date"
                  {...control}
                  {...register("checkOutDate", {
                    validate: (value, values) => validateCheckOutDate(value, values.checkInDate),
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
          <HotelAvailabilityNotice state={notice} />
          <p className="text-xs text-muted">
            Lưu trú không kèm dịch vụ spa. Nếu khách muốn tắm cho bé, tạo thêm lịch spa riêng.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

