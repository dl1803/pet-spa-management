"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CHANGE_REQUEST_SENT_MESSAGE,
  CHANGE_UNCHANGED_REASON,
  getHotelChangeDefaults,
  isHotelChangeUnchanged,
} from "@/features/booking/change-forms";
import { ChangeSummaryFooter } from "@/features/booking/components/change-summary-parts";
import {
  HotelAvailabilityNotice,
  type HotelAvailabilityNoticeState,
} from "@/features/booking/components/hotel-availability-notice";
import type { HotelQuote } from "@/features/booking/components/hotel-booking-summary";
import { HotelChangeSummary } from "@/features/booking/components/hotel-change-summary";
import { HotelPetPicker } from "@/features/booking/components/hotel-pet-picker";
import { HotelStayForm } from "@/features/booking/components/hotel-stay-form";
import {
  CHECK_IN_PAST_MESSAGE,
  CHECK_OUT_NOT_AFTER_MESSAGE,
  describeAvailable,
  getStay,
  getStayKey,
  isCheckInPast,
  isCheckOutNotAfter,
  isNoCapacityError,
  NO_CAPACITY_REASON,
  toHotelBookingRequest,
  type HotelBookingFormValues,
} from "@/features/booking/forms";
import { mockUpdateAppointment } from "@/features/booking/mock-change";
import { MOCK_PETS } from "@/features/booking/mock-data";
import { HOTEL_AVAILABILITY_QUERY_KEY, mockGetHotelAvailability } from "@/features/booking/mock-hotel";
import type { AppointmentDetail } from "@/lib/api/types";
import { isChangeWindowClosedError, isInvalidTransitionError } from "@/lib/appointments";
import { formatDayAndTime } from "@/lib/format";
import { appointmentKeys } from "@/lib/queries/appointments";
import { ROUTES, WINDOW_CLOSED_PARAM, WINDOW_CLOSED_VALUE, withQuery } from "@/lib/routes";
import { buildStoreDateTime, getStoreDateKey } from "@/lib/time";

// Chờ người dùng ngừng chỉnh ngày giờ rồi mới kiểm tra chỗ.
const AVAILABILITY_DELAY_MS = 400;

export function HotelChangeForm({ appointment }: { appointment: AppointmentDetail }) {
  // Thú cưng giả, cùng nguồn với màn đặt lịch lưu trú. Chờ nối API thật ở bước tích hợp.
  const pets = MOCK_PETS;
  const { appointmentId } = appointment;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const [initialValues] = useState(() => getHotelChangeDefaults(appointment, pets));

  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<HotelBookingFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: initialValues,
  });

  const petId = useWatch({ control, name: "petId" });
  const checkInDate = useWatch({ control, name: "checkInDate" });
  const checkInTime = useWatch({ control, name: "checkInTime" });
  const checkOutDate = useWatch({ control, name: "checkOutDate" });
  const checkOutTime = useWatch({ control, name: "checkOutTime" });

  const pet = pets.find((item) => item.petId === petId);
  const stayValues = { checkInDate, checkInTime, checkOutDate, checkOutTime };
  const stay = getStay(stayValues, todayKey);
  const stayKey = getStayKey(stay);
  const checkOutInvalid = isCheckOutNotAfter(stayValues);

  // Chỉ hỏi chỗ trống khi khoảng lưu trú đã ngừng thay đổi.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(stayKey), AVAILABILITY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [stayKey]);
  const settledStay = stay !== null && stayKey === settledKey ? stay : null;

  const availabilityQuery = useQuery({
    queryKey: [...HOTEL_AVAILABILITY_QUERY_KEY, { petId, stayKey: getStayKey(settledStay) }],
    queryFn:
      pet !== undefined && settledStay !== null
        ? () => mockGetHotelAvailability({ petId: pet.petId, from: settledStay.from, to: settledStay.to })
        : skipToken,
    refetchOnWindowFocus: false,
  });

  const {
    mutate,
    isPending,
    error: submitError,
    reset: resetSubmit,
  } = useMutation({
    mutationFn: mockUpdateAppointment,
    onSuccess: async () => {
      showSuccess(CHANGE_REQUEST_SENT_MESSAGE);
      void queryClient.invalidateQueries({ queryKey: HOTEL_AVAILABILITY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: appointmentKeys.all, refetchType: "all" });
      router.push(ROUTES.appointmentDetail(appointmentId));
    },
    onError: (failure) => {
      // Quá thời hạn tự đổi: về chi tiết với hai nút đã khóa.
      if (isChangeWindowClosedError(failure)) {
        router.replace(
          withQuery(ROUTES.appointmentDetail(appointmentId), { [WINDOW_CLOSED_PARAM]: WINDOW_CLOSED_VALUE }),
        );
        return;
      }
      if (isNoCapacityError(failure)) {
        void queryClient.invalidateQueries({ queryKey: HOTEL_AVAILABILITY_QUERY_KEY });
        return;
      }
      if (isInvalidTransitionError(failure)) {
        void queryClient.invalidateQueries({ queryKey: appointmentKeys.all, refetchType: "all" });
      }
    },
  });

  // Đổi thú cưng hoặc khoảng lưu trú thì bỏ lỗi của lần gửi trước.
  useEffect(() => {
    resetSubmit();
  }, [petId, stayKey, resetSubmit]);

  if (pet === undefined) {
    return (
      <Card>
        <EmptyState
          icon="paw"
          title="Chưa có thú cưng"
          description="Thêm hồ sơ cho bé để đổi lịch hẹn."
          action={
            <ButtonLink href={ROUTES.petCreate} variant="secondary">
              <Icon name="plus" />
              Thêm thú cưng
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const availability = availabilityQuery.data;
  const isNoCapacity = submitError !== null && isNoCapacityError(submitError);
  const generalError =
    submitError !== null && !isNoCapacity && !isChangeWindowClosedError(submitError) ? submitError : null;

  const isChecking =
    stay !== null &&
    (settledStay === null || availabilityQuery.isPending || (availabilityQuery.isError && availabilityQuery.isFetching));

  let notice: HotelAvailabilityNoticeState = { kind: "idle" };
  if (stay !== null) {
    if (isNoCapacity) {
      notice = { kind: "full" };
    } else if (isChecking) {
      notice = { kind: "checking" };
    } else if (availabilityQuery.error !== null) {
      notice = { kind: "error", error: availabilityQuery.error };
    } else if (availability !== undefined) {
      notice = availability.available
        ? { kind: "available", message: describeAvailable(pet, stay, availability.nights) }
        : { kind: "full" };
    }
  }

  // Số đêm và số tiền chỉ lấy từ kết quả của server.
  const quote: HotelQuote | null =
    availability !== undefined && (notice.kind === "available" || notice.kind === "full")
      ? { nights: availability.nights, estimatedAmount: availability.estimatedAmount }
      : null;

  const isUnchanged = isHotelChangeUnchanged(initialValues, {
    petId,
    checkInDate,
    checkInTime,
    checkOutDate,
    checkOutTime,
  });
  const lockReason = isUnchanged
    ? CHANGE_UNCHANGED_REASON
    : checkOutInvalid
      ? CHECK_OUT_NOT_AFTER_MESSAGE
      : isCheckInPast(checkInDate, todayKey)
        ? CHECK_IN_PAST_MESSAGE
        : stay === null
          ? "Vui lòng nhập đủ ngày và giờ nhận, trả."
          : notice.kind === "full"
            ? NO_CAPACITY_REASON
            : notice.kind === "error"
              ? "Chưa kiểm tra được chỗ trống, vui lòng thử lại."
              : notice.kind === "checking"
                ? "Đang kiểm tra chỗ trống, vui lòng đợi trong giây lát."
                : null;

  // Chỉ kiểm tra lại khi ngày trả đã nhập, để không báo thiếu ngày trả quá sớm.
  function revalidateCheckOutDate() {
    if (getValues("checkOutDate") !== "") void trigger("checkOutDate");
  }

  function onSubmit() {
    if (isPending || stay === null || lockReason !== null) return;
    mutate({ appointmentId, request: toHotelBookingRequest(petId, stay) });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Chọn thú cưng" />
            <CardBody>
              <HotelPetPicker pets={pets} selectedPetId={petId} onSelect={(id) => setValue("petId", id)} />
            </CardBody>
          </Card>

          <HotelStayForm
            register={register}
            errors={errors}
            todayKey={todayKey}
            onCheckInDateChange={revalidateCheckOutDate}
          >
            <HotelAvailabilityNotice notice={notice} onRetry={() => void availabilityQuery.refetch()} />
          </HotelStayForm>
        </div>

        <HotelChangeSummary
          pet={pet}
          checkInText={toDayAndTime(checkInDate, checkInTime)}
          checkOutText={toDayAndTime(checkOutDate, checkOutTime)}
          checkOutInvalid={checkOutInvalid}
          quote={quote}
          footer={
            <ChangeSummaryFooter
              submitError={generalError}
              isSubmitting={isPending}
              lockReason={lockReason}
              keepHref={ROUTES.appointmentDetail(appointmentId)}
            />
          }
        />
      </div>
    </form>
  );
}

function toDayAndTime(date: string, time: string) {
  if (date === "" || time === "" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const iso = buildStoreDateTime(date, time);
  if (Number.isNaN(Date.parse(iso))) return null;
  return formatDayAndTime(iso);
}

