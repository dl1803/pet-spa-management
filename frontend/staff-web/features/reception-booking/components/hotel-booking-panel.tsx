"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useToast } from "@/components/feedback/toast";
import { BookingPetCard } from "@/features/reception-booking/components/booking-pet-card";
import type { AvailabilityNoticeState } from "@/features/reception-booking/components/hotel-availability-notice";
import { HotelBookingSummary } from "@/features/reception-booking/components/hotel-booking-summary";
import { HotelStayForm } from "@/features/reception-booking/components/hotel-stay-form";
import {
  CHECK_OUT_NOT_AFTER_MESSAGE,
  describeAvailable,
  EMPTY_STAY_VALUES,
  findPricingRow,
  getStay,
  getStayKey,
  isCheckOutNotAfter,
  isNoCapacityError,
  NO_CAPACITY_REASON,
  toHotelBookingRequest,
  type HotelStayFormValues,
} from "@/features/reception-booking/forms";
import type { Pet } from "@/lib/api/types";
import { formatAppointmentCode, formatDayAndTime } from "@/lib/format";
import { useCreateHotelAppointment } from "@/lib/queries/appointments";
import { useHotelAvailability, useHotelPricing } from "@/lib/queries/hotel";
import { ROUTES } from "@/lib/routes";
import type { ServingCustomer } from "@/lib/serving-customer";
import { buildStoreDateTime } from "@/lib/time";

const AVAILABILITY_DELAY_MS = 400;

type HotelBookingPanelProps = {
  customer: ServingCustomer;
  pets: Pet[];
  pet: Pet;
  onPetSelect: (petId: string) => void;
};

export function HotelBookingPanel({ customer, pets, pet, onPetSelect }: HotelBookingPanelProps) {
  const router = useRouter();
  const { showSuccess } = useToast();

  const {
    register,
    control,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<HotelStayFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: EMPTY_STAY_VALUES,
  });
  const checkInDate = useWatch({ control, name: "checkInDate" });
  const checkInTime = useWatch({ control, name: "checkInTime" });
  const checkOutDate = useWatch({ control, name: "checkOutDate" });
  const checkOutTime = useWatch({ control, name: "checkOutTime" });
  const values: HotelStayFormValues = { checkInDate, checkInTime, checkOutDate, checkOutTime };

  const stay = getStay(values);
  const stayKey = getStayKey(stay);

  const [settledKey, setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(stayKey), AVAILABILITY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [stayKey]);
  const settledStay = stay !== null && stayKey === settledKey ? stay : null;

  const availabilityQuery = useHotelAvailability(
    settledStay === null ? null : { petId: pet.petId, from: settledStay.from, to: settledStay.to },
  );
  const availability = availabilityQuery.data;
  const pricingQuery = useHotelPricing();

  const { mutate, isPending, error: submitError, reset: resetSubmit } = useCreateHotelAppointment();

  useEffect(() => {
    resetSubmit();
  }, [pet.petId, stayKey, resetSubmit]);

  const isNoCapacity = submitError !== null && isNoCapacityError(submitError);
  const generalError = submitError !== null && !isNoCapacity ? submitError : null;

  let notice: AvailabilityNoticeState = { kind: "idle" };
  if (stay !== null) {
    if (isNoCapacity) {
      notice = { kind: "full" };
    } else if (settledStay === null || availabilityQuery.isFetching) {
      notice = { kind: "checking" };
    } else if (availabilityQuery.error !== null) {
      notice = { kind: "error", error: availabilityQuery.error, onRetry: () => void availabilityQuery.refetch() };
    } else if (availability) {
      notice = availability.available
        ? { kind: "available", message: describeAvailable(pet, stay, availability.nights) }
        : { kind: "full" };
    }
  }

  const rate = findPricingRow(pricingQuery.data?.pricing ?? [], pet) ?? null;
  const quote =
    availability && (notice.kind === "available" || notice.kind === "full")
      ? { nights: availability.nights, estimatedAmount: availability.estimatedAmount }
      : null;
  const lockReason =
    notice.kind === "full" ? NO_CAPACITY_REASON : isCheckOutNotAfter(values) ? CHECK_OUT_NOT_AFTER_MESSAGE : null;

  function revalidateCheckOutDate() {
    if (getValues("checkOutDate") !== "") void trigger("checkOutDate");
  }

  function onSubmit() {
    if (isPending || stay === null || notice.kind === "checking" || notice.kind === "full") return;
    mutate(toHotelBookingRequest(customer.customerId, pet.petId, stay), {
      onSuccess: (created) => {
        showSuccess(`Đã tạo lịch lưu trú ${formatAppointmentCode(created.appointmentId)}, đang chờ quản lý xác nhận`);
        router.push(ROUTES.appointments);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <BookingPetCard
            pets={pets}
            selectedPetId={pet.petId}
            onSelect={onPetSelect}
            addPetHref={ROUTES.customerPetNew(customer.customerId)}
          />
          <HotelStayForm
            register={register}
            errors={errors}
            notice={notice}
            onCheckInDateChange={revalidateCheckOutDate}
          />
        </div>
        <HotelBookingSummary
          pet={pet}
          checkInText={checkInDate && checkInTime ? formatDayAndTime(buildStoreDateTime(checkInDate, checkInTime)) : null}
          checkOutText={
            checkOutDate && checkOutTime ? formatDayAndTime(buildStoreDateTime(checkOutDate, checkOutTime)) : null
          }
          quote={quote}
          rate={rate}
          lockReason={lockReason}
          isSubmitting={isPending}
          submitError={generalError}
        />
      </div>
    </form>
  );
}
