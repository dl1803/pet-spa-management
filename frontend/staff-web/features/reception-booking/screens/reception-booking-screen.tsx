"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import type { AvailabilityNoticeState } from "@/features/reception-booking/components/hotel-availability-notice";
import { HotelBookingSummary } from "@/features/reception-booking/components/hotel-booking-summary";
import { HotelStayForm } from "@/features/reception-booking/components/hotel-stay-form";
import { PetChoiceList } from "@/features/reception-booking/components/pet-choice-list";
import { ServingCustomerBar } from "@/features/reception-booking/components/serving-customer-bar";
import {
  describeAvailable,
  EMPTY_STAY_VALUES,
  findPricingRow,
  getInitialPetId,
  getStay,
  getStayKey,
  isCheckOutNotAfter,
  isNoCapacityError,
  NO_CAPACITY_REASON,
  CHECK_OUT_NOT_AFTER_MESSAGE,
  parseBookingType,
  toHotelBookingRequest,
  type BookingType,
  type HotelStayFormValues,
} from "@/features/reception-booking/forms";
import { findMockCustomer, getMockPets, MOCK_HOTEL_PRICING } from "@/features/reception-booking/mock-data";
import {
  HOTEL_AVAILABILITY_QUERY_KEY,
  mockCreateHotelAppointment,
  mockGetHotelAvailability,
} from "@/features/reception-booking/mock-hotel";
import type { Customer } from "@/lib/api/types";
import { formatAppointmentCode, formatDayAndTime } from "@/lib/format";
import { ROUTES, withQuery } from "@/lib/routes";
import { buildStoreDateTime } from "@/lib/time";

const TITLE = "Đặt lịch thay khách";
const DESCRIPTION = "Dùng khi khách đến quầy hoặc gọi điện. Không áp dụng khóa tự đặt lịch.";
const AVAILABILITY_DELAY_MS = 400;

const BOOKING_TABS: { value: BookingType; label: string }[] = [
  { value: "Spa", label: "Lịch spa" },
  { value: "Hotel", label: "Lưu trú" },
];

export function ReceptionBookingScreen() {
  const searchParams = useSearchParams();
  const customer = findMockCustomer(searchParams.get("customerId"));

  if (customer === null) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <Card>
          <EmptyState
            icon="users"
            title="Chưa chọn khách hàng"
            description="Chọn khách ở màn Khách hàng để đặt lịch thay."
            action={<Button disabled>Tìm khách</Button>}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <BookingContent
        key={customer.customerId}
        customer={customer}
        type={parseBookingType(searchParams.get("type"))}
        requestedPetId={searchParams.get("petId")}
      />
    </>
  );
}

type BookingContentProps = {
  customer: Customer;
  type: BookingType;
  requestedPetId: string | null;
};

function BookingContent({ customer, type, requestedPetId }: BookingContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const pets = getMockPets(customer.customerId);
  const [petId, setPetId] = useState(() => getInitialPetId(pets, requestedPetId));
  const pet = pets.find((item) => item.petId === petId) ?? null;

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

  const availabilityQuery = useQuery({
    queryKey: [...HOTEL_AVAILABILITY_QUERY_KEY, { petId, stayKey: getStayKey(settledStay) }],
    queryFn:
      pet !== null && settledStay !== null
        ? () => mockGetHotelAvailability({ petId: pet.petId, from: settledStay.from, to: settledStay.to })
        : skipToken,
  });
  const availability = availabilityQuery.data;

  const {
    mutate,
    isPending,
    error: submitError,
    reset: resetSubmit,
  } = useMutation({
    mutationFn: mockCreateHotelAppointment,
    onSuccess: (created) => {
      showSuccess(`Đã tạo lịch lưu trú ${formatAppointmentCode(created.appointmentId)}, đang chờ quản lý xác nhận`);
      router.push(ROUTES.appointments);
    },
    onError: (failure) => {
      if (isNoCapacityError(failure)) {
        void queryClient.invalidateQueries({ queryKey: HOTEL_AVAILABILITY_QUERY_KEY });
      }
    },
  });

  useEffect(() => {
    resetSubmit();
  }, [petId, stayKey, resetSubmit]);

  const isNoCapacity = submitError !== null && isNoCapacityError(submitError);
  const generalError = submitError !== null && !isNoCapacity ? submitError : null;

  let notice: AvailabilityNoticeState = { kind: "idle" };
  if (pet !== null && stay !== null) {
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

  const rate = pet !== null ? (findPricingRow(MOCK_HOTEL_PRICING, pet) ?? null) : null;
  const quote =
    availability && (notice.kind === "available" || notice.kind === "full")
      ? { nights: availability.nights, estimatedAmount: availability.estimatedAmount }
      : null;
  const lockReason = notice.kind === "full" ? NO_CAPACITY_REASON : isCheckOutNotAfter(values) ? CHECK_OUT_NOT_AFTER_MESSAGE : null;

  function revalidateCheckOutDate() {
    if (getValues("checkOutDate") !== "") void trigger("checkOutDate");
  }

  function handleTypeChange(next: BookingType) {
    router.replace(withQuery(ROUTES.booking, { customerId: customer.customerId, petId, type: next }), {
      scroll: false,
    });
  }

  function onSubmit() {
    if (isPending || pet === null || stay === null) return;
    mutate(toHotelBookingRequest(customer.customerId, pet.petId, stay));
  }

  return (
    <>
      <ServingCustomerBar customer={customer} />
      <Tabs label="Loại lịch" items={BOOKING_TABS} value={type} onChange={handleTypeChange} />
      {type === "Spa" ? (
        <Card>
          <EmptyState
            icon="droplet"
            title="Chức năng chưa khả dụng"
            description="Đặt lịch spa thay khách chưa có. Chọn Lưu trú để đặt lịch lưu trú."
          />
        </Card>
      ) : pet === null ? (
        <Card>
          <EmptyState
            icon="user"
            title="Khách chưa có thú cưng"
            description="Cần tạo hồ sơ thú cưng cho khách trước khi đặt lịch."
            action={
              <Button variant="secondary" disabled>
                <Icon name="plus" className="size-3.5" />
                Thêm thú cưng
              </Button>
            }
          />
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader title="Thú cưng">
                  <Button variant="ghost" size="sm" disabled>
                    <Icon name="plus" className="size-3.5" />
                    Thêm thú cưng
                  </Button>
                </CardHeader>
                <CardBody>
                  <PetChoiceList pets={pets} selectedPetId={pet.petId} onSelect={setPetId} />
                </CardBody>
              </Card>
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
      )}
    </>
  );
}

