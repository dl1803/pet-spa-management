"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  HotelAvailabilityNotice,
  type HotelAvailabilityNoticeState,
} from "@/features/booking/components/hotel-availability-notice";
import { HotelBookingSummary, type HotelQuote } from "@/features/booking/components/hotel-booking-summary";
import { HotelPetPicker } from "@/features/booking/components/hotel-pet-picker";
import { HotelStayForm } from "@/features/booking/components/hotel-stay-form";
import {
  BOOKING_LOCKED_REASON,
  CHECK_OUT_NOT_AFTER_MESSAGE,
  describeAvailable,
  EMPTY_HOTEL_STAY_VALUES,
  findHotelPricingRow,
  getInitialPetId,
  getStay,
  getStayKey,
  isBookingLockedError,
  isCheckOutNotAfter,
  isNoCapacityError,
  NO_CAPACITY_REASON,
  toHotelBookingRequest,
  type HotelBookingFormValues,
} from "@/features/booking/forms";
import { MOCK_PETS } from "@/features/booking/mock-data";
import {
  HOTEL_AVAILABILITY_QUERY_KEY,
  HOTEL_PRICING_QUERY_KEY,
  mockCreateHotelAppointment,
  mockGetHotelAvailability,
  mockGetHotelPricing,
} from "@/features/booking/mock-hotel";
import { formatDayAndTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { buildStoreDateTime, getStoreDateKey } from "@/lib/time";

const DESCRIPTION = "Bé ở chuồng riêng hợp loài và kích cỡ, có thức ăn do cửa hàng chuẩn bị. Lưu trú không kèm dịch vụ spa.";

// Chờ người dùng ngừng chỉnh ngày giờ rồi mới kiểm tra chỗ.
const AVAILABILITY_DELAY_MS = 400;

export function HotelBookingScreen() {
  // Thú cưng giả, cùng nguồn với màn đặt lịch spa. Chờ nối API thật ở bước tích hợp.
  const pets = MOCK_PETS;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const [isBookingLocked, setIsBookingLocked] = useState(false);

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
    defaultValues: {
      petId: getInitialPetId(pets, searchParams.get("petId")),
      ...EMPTY_HOTEL_STAY_VALUES,
    },
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
  const pricingQuery = useQuery({ queryKey: HOTEL_PRICING_QUERY_KEY, queryFn: mockGetHotelPricing });

  const {
    mutate,
    isPending,
    error: submitError,
    reset: resetSubmit,
  } = useMutation({
    mutationFn: mockCreateHotelAppointment,
    onSuccess: () => {
      showSuccess("Đã gửi yêu cầu lưu trú");
      void queryClient.invalidateQueries({ queryKey: HOTEL_AVAILABILITY_QUERY_KEY });
      // Chi tiết lịch hẹn chưa có route, nên về danh sách lịch hẹn như luồng đặt lịch spa.
      router.push(ROUTES.appointments);
    },
    onError: (failure) => {
      if (isNoCapacityError(failure)) void queryClient.invalidateQueries({ queryKey: HOTEL_AVAILABILITY_QUERY_KEY });
      if (isBookingLockedError(failure)) setIsBookingLocked(true);
    },
  });

  // Đồng bộ petId khi danh sách thú cưng tải xong hoặc thay đổi.
  useEffect(() => {
    if (getValues("petId") === "" && pets.length > 0) {
      setValue("petId", getInitialPetId(pets, searchParams.get("petId")));
    }
  }, [pets, searchParams, setValue, getValues]);

  // Đổi thú cưng hoặc khoảng lưu trú thì bỏ lỗi của lần gửi trước.
  useEffect(() => {
    resetSubmit();
  }, [petId, stayKey, resetSubmit]);

  if (pet === undefined) {
    return (
      <>
        <PageHeader title="Đặt lịch lưu trú" description={DESCRIPTION} />
        <Card>
          <EmptyState
            icon="paw"
            title="Chưa có thú cưng"
            description="Thêm hồ sơ cho bé để xem giá đúng nhóm kích cỡ và bắt đầu đặt lịch."
            action={
              <ButtonLink href={ROUTES.petCreate} variant="secondary">
                <Icon name="plus" />
                Thêm thú cưng
              </ButtonLink>
            }
          />
        </Card>
      </>
    );
  }

  const availability = availabilityQuery.data;
  const isNoCapacity = submitError !== null && isNoCapacityError(submitError);
  const generalError =
    submitError !== null &&
    !isNoCapacityError(submitError) &&
    !isBookingLockedError(submitError)
      ? submitError
      : null;

  const isChecking =
    stay !== null &&
    (settledStay === null || availabilityQuery.isPending || (availabilityQuery.isError && availabilityQuery.isFetching));

  let notice: HotelAvailabilityNoticeState = { kind: "idle" };
  if (isBookingLocked) {
    notice = { kind: "locked" };
  } else if (stay !== null) {
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

  const rate = pricingQuery.data ? findHotelPricingRow(pricingQuery.data.pricing, pet) : null;
  const lateFeePerBlock = pricingQuery.data?.lateFeePerBlock ?? 0;

  const lockReason = isBookingLocked
    ? BOOKING_LOCKED_REASON
    : notice.kind === "full"
      ? NO_CAPACITY_REASON
      : notice.kind === "error"
        ? "Chưa kiểm tra được chỗ trống, vui lòng thử lại."
        : notice.kind === "checking"
          ? "Đang kiểm tra chỗ trống, vui lòng đợi trong giây lát."
          : checkOutInvalid
            ? CHECK_OUT_NOT_AFTER_MESSAGE
            : null;

  // Chỉ kiểm tra lại khi ngày trả đã nhập, để không báo thiếu ngày trả quá sớm.
  function revalidateCheckOutDate() {
    if (getValues("checkOutDate") !== "") void trigger("checkOutDate");
  }

  function onSubmit() {
    if (isPending || pet === undefined || stay === null) return;
    if (notice.kind === "checking" || notice.kind === "full" || notice.kind === "locked" || notice.kind === "error") return;
    mutate(toHotelBookingRequest(pet.petId, stay));
  }

  return (
    <>
      <PageHeader title="Đặt lịch lưu trú" description={DESCRIPTION} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="Chọn thú cưng">
                <LinkButton href={ROUTES.petCreate}>
                  <Icon name="plus" className="size-3.5" />
                  Thêm thú cưng
                </LinkButton>
              </CardHeader>
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

            <Alert tone="neutral" icon="info">
              Muốn tắm hoặc cắt tỉa cho bé trong thời gian lưu trú? Hãy{" "}
              <Link href={ROUTES.spaBooking} className="font-semibold text-lagoon hover:text-lagoon-700">
                đặt lịch spa riêng
              </Link>
              .
            </Alert>
          </div>

          <HotelBookingSummary
            pet={pet}
            rate={rate}
            lateFeePerBlock={lateFeePerBlock}
            checkInText={toDayAndTime(checkInDate, checkInTime)}
            checkOutText={toDayAndTime(checkOutDate, checkOutTime)}
            checkOutInvalid={checkOutInvalid}
            quote={quote}
            submitError={generalError}
            isSubmitting={isPending}
            pricingError={pricingQuery.isError}
            onRetryPricing={() => void pricingQuery.refetch()}
            lockReason={lockReason}
          />
        </div>
      </form>
    </>
  );
}

function toDayAndTime(date: string, time: string) {
  if (date === "" || time === "" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const iso = buildStoreDateTime(date, time);
  if (Number.isNaN(Date.parse(iso))) return null;
  return formatDayAndTime(iso);
}

