"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { BookingPetCard } from "@/features/reception-booking/components/booking-pet-card";
import { SpaBookingSummary } from "@/features/reception-booking/components/spa-booking-summary";
import { SpaScheduleCard } from "@/features/reception-booking/components/spa-schedule-card";
import { SpaServiceList, SpaServiceListSkeleton } from "@/features/reception-booking/components/spa-service-list";
import {
  formatSpaTime,
  formatStaffNeed,
  getApplicableServices,
  getBookingDates,
  isSlotFullError,
  SERVICE_REQUIRED_MESSAGE,
  SLOT_REQUIRED_MESSAGE,
  summarizeSelection,
  toSpaBookingRequest,
  type SpaFormValues,
} from "@/features/reception-booking/spa-forms";
import type { Pet } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useCreateSpaAppointment } from "@/lib/queries/appointments";
import { useServices } from "@/lib/queries/services";
import { useSpaSlots } from "@/lib/queries/spa-slots";
import { ROUTES } from "@/lib/routes";
import type { ServingCustomer } from "@/lib/serving-customer";
import { getStoreDateKey } from "@/lib/time";

type SpaBookingPanelProps = {
  customer: ServingCustomer;
  pets: Pet[];
  pet: Pet;
  onPetSelect: (petId: string) => void;
};

export function SpaBookingPanel({ customer, pets, pet, onPetSelect }: SpaBookingPanelProps) {
  const router = useRouter();
  const { showSuccess } = useToast();
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const dates = getBookingDates(todayKey);

  const { control, handleSubmit, setValue, getValues, setError, clearErrors, reset, formState: { errors } } =
    useForm<SpaFormValues>({
      mode: "onTouched",
      reValidateMode: "onChange",
      shouldFocusError: true,
      defaultValues: { serviceIds: [], date: todayKey, slotTime: "" },
    });
  const serviceIds = useWatch({ control, name: "serviceIds" });
  const date = useWatch({ control, name: "date" });
  const slotTime = useWatch({ control, name: "slotTime" });

  const servicesQuery = useServices({ species: pet.species, sizeGroup: pet.sizeGroup });
  const applicable = getApplicableServices(servicesQuery.data ?? [], pet);
  const selected = applicable.filter(({ service }) => serviceIds.includes(service.serviceId));
  const selectedIds = selected.map(({ service }) => service.serviceId);

  const slotsQuery = useSpaSlots(selectedIds.length > 0 ? { date, petId: pet.petId, serviceIds: selectedIds } : null);
  const slots = slotsQuery.data;
  const isSlotAvailable = slots?.slots.some((slot) => slot.time === slotTime && slot.status === "Available") ?? false;

  const { mutate, isPending, error: submitError, reset: resetSubmit } = useCreateSpaAppointment();
  const isSlotFull = submitError !== null && isSlotFullError(submitError);
  const generalError = submitError !== null && !isSlotFull ? submitError : null;

  function handlePetSelect(nextPetId: string) {
    if (nextPetId === pet.petId) return;
    reset({ serviceIds: [], date: getValues("date"), slotTime: "" });
    resetSubmit();
    onPetSelect(nextPetId);
  }

  function handleServiceToggle(serviceId: string, checked: boolean, onChange: (ids: string[]) => void) {
    const current = getValues("serviceIds");
    onChange(checked ? [...current, serviceId] : current.filter((id) => id !== serviceId));
    setValue("slotTime", "");
    clearErrors("slotTime");
    resetSubmit();
  }

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

  function onSubmit(values: SpaFormValues) {
    if (isPending) return;
    if (selectedIds.length === 0) {
      setError("serviceIds", { message: SERVICE_REQUIRED_MESSAGE });
      return;
    }
    if (!isSlotAvailable) {
      setError("slotTime", { message: SLOT_REQUIRED_MESSAGE });
      return;
    }
    mutate(toSpaBookingRequest(customer.customerId, pet.petId, { ...values, serviceIds: selectedIds }), {
      onSuccess: (created) => {
        showSuccess(`Đã tạo lịch spa ${formatAppointmentCode(created.appointmentId)}, đang chờ quản lý xác nhận`);
        router.push(ROUTES.appointments);
      },
      onError: (failure) => {
        if (isSlotFullError(failure)) {
          setValue("slotTime", "");
          clearErrors("slotTime");
        }
      },
    });
  }

  const summary = summarizeSelection(pet, selected);
  const durationMinutes = slots?.durationMinutes ?? summary.totalMinutes;
  const staffRequired = slots?.staffRequired ?? summary.staffRequired;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <BookingPetCard
            pets={pets}
            selectedPetId={pet.petId}
            onSelect={handlePetSelect}
            addPetHref={ROUTES.customerPetNew(customer.customerId)}
          />

          <Card>
            <CardHeader title="Dịch vụ">
              <span className="text-xs text-muted">{`Giá nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]} của ${SPECIES_LABELS[pet.species].toLocaleLowerCase("vi-VN")}`}</span>
            </CardHeader>
            <CardBody>
              {servicesQuery.data === undefined ? (
                servicesQuery.error !== null ? (
                  <div className="flex flex-col items-start gap-2">
                    <ErrorAlert error={servicesQuery.error} className="w-full" />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void servicesQuery.refetch()}
                      loading={servicesQuery.isFetching}
                      loadingText="Đang tải…"
                    >
                      Thử lại
                    </Button>
                  </div>
                ) : (
                  <SpaServiceListSkeleton />
                )
              ) : applicable.length === 0 ? (
                <p className="text-muted">Chưa có dịch vụ nào áp dụng cho nhóm này.</p>
              ) : (
                <Controller
                  control={control}
                  name="serviceIds"
                  rules={{ validate: (ids) => ids.length > 0 || SERVICE_REQUIRED_MESSAGE }}
                  render={({ field, fieldState }) => (
                    <SpaServiceList
                      applicable={applicable}
                      selectedIds={field.value}
                      firstInputRef={field.ref}
                      error={fieldState.error?.message}
                      onToggle={(serviceId, checked) => handleServiceToggle(serviceId, checked, field.onChange)}
                    />
                  )}
                />
              )}
            </CardBody>
          </Card>

          <SpaScheduleCard
            pet={pet}
            dates={dates}
            date={date}
            onDateChange={handleDateChange}
            hasServices={selectedIds.length > 0}
            slots={slots}
            isLoading={slots === undefined && slotsQuery.isFetching}
            error={slots === undefined ? slotsQuery.error : null}
            onRetry={() => void slotsQuery.refetch()}
            slotTime={slotTime}
            onSlotChange={handleSlotChange}
            slotError={errors.slotTime?.message}
            isSlotFull={isSlotFull}
          />
        </div>

        <SpaBookingSummary
          pet={pet}
          selected={selected}
          timeText={isSlotAvailable ? formatSpaTime(date, slotTime, durationMinutes) : null}
          staffText={selected.length > 0 ? formatStaffNeed(pet, staffRequired) : null}
          totalPrice={summary.totalPrice}
          isSubmitting={isPending}
          submitError={generalError}
        />
      </div>
    </form>
  );
}
