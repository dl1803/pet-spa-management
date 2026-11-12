"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ServiceOption } from "@/components/domain/service-option";
import { FieldError } from "@/components/feedback/field-error";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CHANGE_REQUEST_SENT_MESSAGE,
  CHANGE_UNCHANGED_REASON,
  getSpaChangeDefaults,
  isSpaChangeUnchanged,
} from "@/features/booking/change-forms";
import { ChangeSummaryFooter } from "@/features/booking/components/change-summary-parts";
import { SpaBookingSlotStep } from "@/features/booking/components/spa-booking-slot-step";
import { SpaChangeSummary } from "@/features/booking/components/spa-change-summary";
import {
  formatSlotRange,
  getApplicableServices,
  getBookingDates,
  getLatestStart,
  isSlotFullError,
  keepApplicableServiceIds,
  SERVICE_REQUIRED_MESSAGE,
  SLOT_REQUIRED_MESSAGE,
  summarizeSelection,
  toSpaBookingRequest,
  type SpaBookingFormValues,
} from "@/features/booking/forms";
import { mockUpdateAppointment } from "@/features/booking/mock-change";
import { MOCK_PETS, MOCK_SERVICES } from "@/features/booking/mock-data";
import { mockGetSpaSlots, SPA_SLOTS_QUERY_KEY } from "@/features/booking/mock-slots";
import type { AppointmentDetail } from "@/lib/api/types";
import { isChangeWindowClosedError, isInvalidTransitionError } from "@/lib/appointments";
import { formatShortDate, formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { appointmentKeys } from "@/lib/queries/appointments";
import { ROUTES, WINDOW_CLOSED_PARAM, WINDOW_CLOSED_VALUE, withQuery } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

const SERVICE_ERROR_ID = "spa-change-service-error";

export function SpaChangeForm({ appointment }: { appointment: AppointmentDetail }) {
  // Thú cưng và dịch vụ giả, cùng nguồn với màn đặt lịch spa. Chờ nối API thật ở bước tích hợp.
  const pets = MOCK_PETS;
  const services = MOCK_SERVICES;
  const { appointmentId } = appointment;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const dates = getBookingDates(todayKey);
  const [initialValues] = useState(() => getSpaChangeDefaults(appointment, pets, dates));

  const { control, handleSubmit, setValue, getValues } = useForm<SpaBookingFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: initialValues,
  });
  const petId = useWatch({ control, name: "petId" });
  const serviceIds = useWatch({ control, name: "serviceIds" });
  const date = useWatch({ control, name: "date" });
  const slotTime = useWatch({ control, name: "slotTime" });

  const pet = pets.find((item) => item.petId === petId);
  const applicable = pet ? getApplicableServices(services, pet) : [];
  const selected = applicable.filter(({ service }) => serviceIds.includes(service.serviceId));
  const selectedServiceIds = selected.map(({ service }) => service.serviceId);
  const hasServices = pet !== undefined && selected.length > 0;

  const slotsQuery = useQuery({
    queryKey: [...SPA_SLOTS_QUERY_KEY, { date, petId, serviceIds: selectedServiceIds }],
    queryFn: () => mockGetSpaSlots({ date, petId, serviceIds: selectedServiceIds }),
    enabled: hasServices,
  });
  const slots = slotsQuery.data;
  const isSlotAvailable = slots?.slots.some((slot) => slot.time === slotTime && slot.status === "Available") ?? false;

  const {
    mutate,
    isPending,
    error: submitError,
    reset: resetSubmit,
  } = useMutation({
    mutationFn: mockUpdateAppointment,
    onSuccess: async () => {
      showSuccess(CHANGE_REQUEST_SENT_MESSAGE);
      void queryClient.invalidateQueries({ queryKey: SPA_SLOTS_QUERY_KEY });
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
      if (isSlotFullError(failure)) {
        setValue("slotTime", "");
        void queryClient.invalidateQueries({ queryKey: SPA_SLOTS_QUERY_KEY });
        return;
      }
      if (isInvalidTransitionError(failure)) {
        void queryClient.invalidateQueries({ queryKey: appointmentKeys.all, refetchType: "all" });
      }
    },
  });

  const isSlotFull = submitError !== null && isSlotFullError(submitError);
  // Lỗi kín mốc hiện ở thẻ khung giờ; lỗi còn lại hiện chung trên nút gửi.
  const generalError =
    submitError !== null && !isSlotFull && !isChangeWindowClosedError(submitError) ? submitError : null;

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

  const summary = summarizeSelection(pet, selected);
  const durationMinutes = slots?.durationMinutes ?? summary.totalMinutes;
  const timeText = isSlotAvailable ? `${formatShortDate(date)}, ${formatSlotRange(slotTime, durationMinutes)}` : null;

  const isUnchanged = isSpaChangeUnchanged(initialValues, { petId, serviceIds: selectedServiceIds, date, slotTime });
  const lockReason = isUnchanged
    ? CHANGE_UNCHANGED_REASON
    : selected.length === 0
      ? SERVICE_REQUIRED_MESSAGE
      : slots === undefined && !slotsQuery.isError
        ? "Đang kiểm tra khung giờ, vui lòng đợi trong giây lát."
        : !isSlotAvailable
          ? SLOT_REQUIRED_MESSAGE
          : null;

  // Đổi ngày thì mốc giờ cũ không còn ý nghĩa.
  function handleDateChange(next: string) {
    if (next === date) return;
    setValue("date", next);
    setValue("slotTime", "");
    resetSubmit();
  }

  function handleSlotChange(time: string) {
    setValue("slotTime", time);
    resetSubmit();
  }

  function onSubmit(values: SpaBookingFormValues) {
    if (isPending || lockReason !== null) return;
    mutate({ appointmentId, request: toSpaBookingRequest(values) });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Chọn thú cưng" />
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
                              resetSubmit();
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
                          resetSubmit();
                        }}
                      />
                    ))}
                    <FieldError id={SERVICE_ERROR_ID} message={fieldState.error?.message} />
                  </fieldset>
                )}
              />
            </CardBody>
          </Card>

          {hasServices ? (
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
              latestStart={getLatestStart(selected)}
              notice={isSlotFull ? submitError : null}
            />
          ) : (
            <Card>
              <CardHeader title="Chọn ngày và khung giờ mới" />
              <CardBody>
                <p className="text-muted">Chọn ít nhất một dịch vụ để xem khung giờ còn chỗ.</p>
              </CardBody>
            </Card>
          )}
        </div>

        <SpaChangeSummary
          pet={pet}
          selectedCount={selected.length}
          durationMinutes={durationMinutes}
          timeText={timeText}
          totalPrice={summary.totalPrice}
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

