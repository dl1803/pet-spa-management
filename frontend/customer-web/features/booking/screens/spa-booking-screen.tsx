"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ServiceOption } from "@/components/domain/service-option";
import { Stepper } from "@/components/domain/stepper";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button, ButtonLink, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SpaBookingReviewStep } from "@/features/booking/components/spa-booking-review-step";
import { SpaBookingSlotStep } from "@/features/booking/components/spa-booking-slot-step";
import { SpaBookingSummary } from "@/features/booking/components/spa-booking-summary";
import {
  formatSlotRange,
  getApplicableServices,
  getBookingDates,
  getInitialPetId,
  getLatestStart,
  isBookingLockedError,
  isSlotFullError,
  keepApplicableServiceIds,
  parseBookingStep,
  SERVICE_REQUIRED_MESSAGE,
  SLOT_REQUIRED_MESSAGE,
  summarizeSelection,
  toSpaBookingRequest,
  type BookingStep,
  type SpaBookingFormValues,
} from "@/features/booking/forms";
import type { Pet, Service } from "@/lib/api/types";
import { formatAppointmentCode, formatLongDate, formatShortDate, formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useCreateSpaAppointment } from "@/lib/queries/appointments";
import { usePets } from "@/lib/queries/pets";
import { useServices } from "@/lib/queries/services";
import { useSpaSlots } from "@/lib/queries/spa-slots";
import { ROUTES, withQuery } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

const BOOKING_STEPS = ["Thú cưng & dịch vụ", "Chọn khung giờ", "Xác nhận"] as const;
const SERVICE_ERROR_ID = "spa-booking-service-error";

function SpaBookingHeader() {
  return (
    <div className="mb-6">
      <h1>Đặt lịch spa</h1>
      <p className="mt-1 text-muted">Bạn chọn bé, dịch vụ và giờ. Cửa hàng xếp nhân viên khi xác nhận.</p>
    </div>
  );
}

function SpaBookingSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Đang tải thông tin đặt lịch…</span>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          {[0, 1].map((index) => (
            <Card key={index}>
              <CardBody>
                <Skeleton className="h-6 w-40 rounded-[10px]" />
                <Skeleton className="mt-4 h-16 rounded-xl" />
                <Skeleton className="mt-2 h-16 rounded-xl" />
              </CardBody>
            </Card>
          ))}
        </div>
        <Card>
          <CardBody>
            <Skeleton className="h-6 w-32 rounded-[10px]" />
            <Skeleton className="mt-4 h-24 rounded-xl" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// Hồ sơ thú cưng và danh mục dịch vụ phải có đủ trước khi dựng form để giá trị mặc định của form đúng.
export function SpaBookingScreen() {
  const petsQuery = usePets();
  const servicesQuery = useServices();
  const pets = petsQuery.data?.items;
  const services = servicesQuery.data;
  const loadError = petsQuery.error ?? servicesQuery.error;
  const isRetrying = petsQuery.isFetching || servicesQuery.isFetching;

  function handleRetry() {
    if (petsQuery.isError) void petsQuery.refetch();
    if (servicesQuery.isError) void servicesQuery.refetch();
  }

  if (pets === undefined || services === undefined) {
    return (
      <>
        <SpaBookingHeader />
        {loadError !== null ? (
          <div>
            <ErrorAlert error={loadError} />
            <div className="mt-4">
              <Button variant="secondary" onClick={handleRetry} loading={isRetrying}>
                Thử lại
              </Button>
            </div>
          </div>
        ) : (
          <SpaBookingSkeleton />
        )}
      </>
    );
  }

  return <SpaBookingForm pets={pets} services={services} />;
}

type SpaBookingFormProps = {
  pets: Pet[];
  services: Service[];
};

function SpaBookingForm({ pets, services }: SpaBookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const [isBookingLocked, setIsBookingLocked] = useState(false);
  const dates = getBookingDates(todayKey);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SpaBookingFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: {
      petId: getInitialPetId(pets, searchParams.get("petId")),
      serviceIds: [],
      date: todayKey,
      slotTime: "",
    },
  });
  const petId = useWatch({ control, name: "petId" });
  const serviceIds = useWatch({ control, name: "serviceIds" });
  const date = useWatch({ control, name: "date" });
  const slotTime = useWatch({ control, name: "slotTime" });

  const step = parseBookingStep(searchParams.get("step"));
  const pet = pets.find((item) => item.petId === petId);
  const applicable = pet ? getApplicableServices(services, pet) : [];
  const selected = applicable.filter(({ service }) => serviceIds.includes(service.serviceId));
  const selectedServiceIds = selected.map(({ service }) => service.serviceId);

  const { mutate, isPending, error: submitError, reset: resetSubmit } = useCreateSpaAppointment();

  const isSlotFull = submitError !== null && isSlotFullError(submitError);
  // Lỗi kín mốc và bị khóa có chỗ hiển thị riêng; lỗi còn lại hiện chung trên nút gửi.
  const generalError =
    submitError !== null && !isSlotFull && !isBookingLockedError(submitError) ? submitError : null;

  // Bước 2 cần thú cưng và ≥ 1 dịch vụ; bước 3 cần thêm mốc giờ. Thiếu thì về bước 1.
  // Khi gặp lỗi 409 SLOT_FULL, giữ isStepReachable để router.replace(..., step: 2) không bị kéo về bước 1.
  const hasStep1Data = pet !== undefined && selected.length > 0;
  const isStepReachable = step === 1 || (hasStep1Data && (step === 2 || slotTime !== "" || isSlotFull));
  const currentStep: BookingStep = isStepReachable ? step : 1;

  useEffect(() => {
    if (!isStepReachable) {
      router.replace(withQuery(ROUTES.spaBooking, { petId }));
    }
  }, [isStepReachable, petId, router]);

  const slotsQuery = useSpaSlots(
    currentStep >= 2 && hasStep1Data ? { date, petId, serviceIds: selectedServiceIds } : null,
  );
  const slots = slotsQuery.data;
  const isSlotAvailable = slots?.slots.some((slot) => slot.time === slotTime && slot.status === "Available") ?? false;

  function goToStep(next: BookingStep, mode: "push" | "replace" = "push") {
    const target = withQuery(ROUTES.spaBooking, {
      petId,
      step: next === 1 ? undefined : next,
    });
    if (mode === "replace") {
      router.replace(target);
    } else {
      router.push(target);
    }
  }

  function handleContinue(values: SpaBookingFormValues) {
    if (currentStep === 1) {
      resetSubmit();
      if (values.serviceIds.length === 0) {
        setError("serviceIds", { message: SERVICE_REQUIRED_MESSAGE });
        return;
      }
      goToStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!isSlotAvailable) {
        setError("slotTime", { message: SLOT_REQUIRED_MESSAGE });
        return;
      }
      goToStep(3);
      return;
    }
    if (isPending) return;
    mutate(toSpaBookingRequest(values), {
      onSuccess: (created) => {
        showSuccess(`Đã gửi yêu cầu đặt lịch ${formatAppointmentCode(created.appointmentId)}`);
        router.push(ROUTES.appointments);
      },
      onError: (failure) => {
        // Mốc vừa kín: về bước chọn giờ; mốc giờ được tải lại trong useCreateSpaAppointment.
        if (isSlotFullError(failure)) {
          setValue("slotTime", "");
          clearErrors("slotTime");
          router.replace(withQuery(ROUTES.spaBooking, { petId, step: 2 }));
          return;
        }
        if (isBookingLockedError(failure)) setIsBookingLocked(true);
      },
    });
  }

  function handleBack() {
    resetSubmit();
    goToStep(currentStep === 3 ? 2 : 1, "replace");
  }

  // Đổi ngày thì mốc giờ cũ không còn ý nghĩa.
  function handleDateChange(next: string) {
    if (next === date) return;
    setValue("date", next);
    setValue("slotTime", "");
    clearErrors("slotTime");
    resetSubmit();
  }

  function handleSlotChange(time: string) {
    setValue("slotTime", time);
    clearErrors("slotTime");
    resetSubmit();
  }

  if (!pet) {
    return (
      <>
        <SpaBookingHeader />
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

  const summary = summarizeSelection(pet, selected);
  // Bước 2–3 lấy thời lượng và số nhân viên từ API; chưa có thì dùng số tính ở web.
  const durationMinutes = currentStep >= 2 ? (slots?.durationMinutes ?? summary.totalMinutes) : summary.totalMinutes;
  const staffRequired = currentStep >= 2 ? (slots?.staffRequired ?? summary.staffRequired) : summary.staffRequired;
  const timeText =
    currentStep >= 2 && isSlotAvailable ? `${formatShortDate(date)}, ${formatSlotRange(slotTime, durationMinutes)}` : null;

  return (
    <>
      <SpaBookingHeader />
      <form onSubmit={handleSubmit(handleContinue)} noValidate>
        <Stepper steps={BOOKING_STEPS} current={currentStep} />
        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
          <div className="flex flex-col gap-4">
            {currentStep === 1 && (
              <>
                <Card>
                  <CardHeader title="Chọn thú cưng">
                    <LinkButton href={ROUTES.petCreate}>
                      <Icon name="plus" className="size-3.5" />
                      Thêm thú cưng
                    </LinkButton>
                  </CardHeader>
                  <CardBody>
                    <fieldset>
                      <legend className="sr-only">Chọn thú cưng</legend>
                      <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                        <Controller
                          control={control}
                          name="petId"
                          render={({ field }) => (
                            <>
                              {pets.map((item) => (
                                <ChoiceCard
                                  key={item.petId}
                                  name={field.name}
                                  value={item.petId}
                                  checked={field.value === item.petId}
                                  onChange={() => {
                                    field.onChange(item.petId);
                                    setValue(
                                      "serviceIds",
                                      keepApplicableServiceIds(getValues("serviceIds"), getApplicableServices(services, item)),
                                    );
                                    setValue("slotTime", "");
                                  }}
                                >
                                  <PetAvatar species={item.species} />
                                  <div>
                                    <div className="font-semibold">{item.name}</div>
                                    <div className="text-xs text-muted">
                                      {`${SPECIES_LABELS[item.species]} ${item.breed}, ${formatWeight(item.weightKg)}, nhóm ${SIZE_GROUP_LABELS[item.sizeGroup]}`}
                                    </div>
                                  </div>
                                </ChoiceCard>
                              ))}
                            </>
                          )}
                        />
                      </div>
                    </fieldset>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title={`Chọn dịch vụ cho ${pet.name}`}>
                    <span className="text-xs text-muted">Chọn một hoặc nhiều</span>
                  </CardHeader>
                  <CardBody>
                    <p className="mb-2 text-xs text-muted">
                      {`Chỉ hiện dịch vụ áp dụng cho ${SPECIES_LABELS[pet.species].toLowerCase()}. Giá và thời lượng theo nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}.`}
                    </p>
                    <Controller
                      control={control}
                      name="serviceIds"
                      rules={{ validate: (ids) => ids.length > 0 || SERVICE_REQUIRED_MESSAGE }}
                      render={({ field, fieldState }) => (
                        <fieldset
                          aria-describedby={fieldState.error ? SERVICE_ERROR_ID : undefined}
                          className="flex flex-col gap-2"
                        >
                          <legend className="sr-only">Dịch vụ</legend>
                          {applicable.map(({ service, pricing }, index) => (
                            <ServiceOption
                              key={service.serviceId}
                              ref={index === 0 ? field.ref : undefined}
                              service={service}
                              pricing={pricing}
                              checked={field.value.includes(service.serviceId)}
                              onChange={(checked) => {
                                field.onChange(
                                  checked
                                    ? [...field.value, service.serviceId]
                                    : field.value.filter((id) => id !== service.serviceId),
                                );
                                setValue("slotTime", "");
                              }}
                            />
                          ))}
                          <FieldError id={SERVICE_ERROR_ID} message={fieldState.error?.message} />
                        </fieldset>
                      )}
                    />
                  </CardBody>
                </Card>
              </>
            )}

            {currentStep === 2 && (
              <SpaBookingSlotStep
                dates={dates}
                date={date}
                onDateChange={handleDateChange}
                slotTime={isSlotAvailable ? slotTime : ""}
                onSlotChange={handleSlotChange}
                slots={slots}
                loadError={slotsQuery.error}
                isRetrying={slotsQuery.isFetching}
                onRetry={() => void slotsQuery.refetch()}
                slotError={errors.slotTime?.message}
                latestStart={getLatestStart(selected)}
                notice={isSlotFull ? submitError : null}
              />
            )}

            {currentStep === 3 && (
              <SpaBookingReviewStep
                pet={pet}
                selected={selected}
                timeText={`${formatLongDate(date)}, ${formatSlotRange(slotTime, durationMinutes)}`}
                staffRequired={staffRequired}
                totalPrice={summary.totalPrice}
                isLocked={isBookingLocked}
              />
            )}
          </div>

          <SpaBookingSummary
            pet={pet}
            selected={selected}
            step={currentStep}
            durationMinutes={durationMinutes}
            staffRequired={staffRequired}
            timeText={timeText}
            totalPrice={summary.totalPrice}
            isSubmitting={isPending}
            submitError={generalError}
            isLocked={isBookingLocked}
            onBack={handleBack}
          />
        </div>
      </form>
    </>
  );
}
