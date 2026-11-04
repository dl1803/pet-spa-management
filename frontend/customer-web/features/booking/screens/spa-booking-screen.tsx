"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ServiceOption } from "@/components/domain/service-option";
import { Stepper } from "@/components/domain/stepper";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { ButtonLink, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { MOCK_PETS, MOCK_SERVICES } from "@/features/booking/mock-data";
import { mockCreateSpaAppointment, mockGetSpaSlots, SPA_SLOTS_QUERY_KEY } from "@/features/booking/mock-slots";
import { formatAppointmentCode, formatLongDate, formatShortDate, formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { ROUTES, withQuery } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

const BOOKING_STEPS = ["Thú cưng & dịch vụ", "Chọn khung giờ", "Xác nhận"] as const;
const SERVICE_ERROR_ID = "spa-booking-service-error";

export function SpaBookingScreen() {
  const pets = MOCK_PETS;
  const services = MOCK_SERVICES;

  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
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

  // Bước 2 cần thú cưng và ≥ 1 dịch vụ; bước 3 cần thêm mốc giờ. Thiếu thì về bước 1.
  const hasStep1Data = pet !== undefined && selected.length > 0;
  const isStepReachable = step === 1 || (hasStep1Data && (step === 2 || slotTime !== ""));
  const currentStep: BookingStep = isStepReachable ? step : 1;

  useEffect(() => {
    if (!isStepReachable) router.replace(ROUTES.spaBooking);
  }, [isStepReachable, router]);

  const slotsQuery = useQuery({
    queryKey: [...SPA_SLOTS_QUERY_KEY, { date, petId, serviceIds: selectedServiceIds }],
    queryFn: () => mockGetSpaSlots({ date, petId, serviceIds: selectedServiceIds }),
    enabled: currentStep >= 2 && hasStep1Data,
  });
  const slots = slotsQuery.data;
  const isSlotAvailable = slots?.slots.some((slot) => slot.time === slotTime && slot.status === "Available") ?? false;

  const {
    mutate,
    isPending,
    error: submitError,
    reset: resetSubmit,
  } = useMutation({
    mutationFn: mockCreateSpaAppointment,
    onSuccess: async (created) => {
      showSuccess(`Đã gửi yêu cầu đặt lịch ${formatAppointmentCode(created.appointmentId)}`);
      await queryClient.invalidateQueries({ queryKey: SPA_SLOTS_QUERY_KEY });
      router.push(ROUTES.appointments);
    },
    onError: (failure) => {
      if (isSlotFullError(failure)) {
        void queryClient.invalidateQueries({ queryKey: SPA_SLOTS_QUERY_KEY });
        router.replace(withQuery(ROUTES.spaBooking, { step: 2 }));
        return;
      }
      if (isBookingLockedError(failure)) setIsBookingLocked(true);
    },
  });

  const isSlotFull = submitError !== null && isSlotFullError(submitError);
  // Lỗi kín mốc và bị khóa có chỗ hiển thị riêng; lỗi còn lại hiện chung trên nút gửi.
  const generalError =
    submitError !== null && !isSlotFull && !isBookingLockedError(submitError) ? submitError : null;

  function goToStep(next: BookingStep, mode: "push" | "replace" = "push") {
    const href = withQuery(ROUTES.spaBooking, { step: next === 1 ? null : next });
    if (mode === "push") router.push(href);
    else router.replace(href);
  }

  function handleContinue(values: SpaBookingFormValues) {
    if (currentStep === 1) {
      resetSubmit();
      goToStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!isSlotAvailable) {
        setError("slotTime", { type: "required", message: SLOT_REQUIRED_MESSAGE });
        return;
      }
      goToStep(3);
      return;
    }
    if (isPending) return;
    mutate(toSpaBookingRequest(values));
  }

  function handleBack() {
    resetSubmit();
    goToStep(currentStep === 3 ? 2 : 1, "replace");
  }

  // Đổi ngày thì mốc giờ cũ không còn ý nghĩa.
  function handleDateChange(next: string) {
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

  const header = (
    <div className="mb-6">
      <h1>Đặt lịch spa</h1>
      <p className="mt-1 text-muted">Bạn chọn bé, dịch vụ và giờ. Cửa hàng xếp nhân viên khi xác nhận.</p>
    </div>
  );

  if (!pet) {
    return (
      <>
        {header}
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
      {header}
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
