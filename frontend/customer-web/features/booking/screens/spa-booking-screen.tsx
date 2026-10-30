"use client";

import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ServiceOption } from "@/components/domain/service-option";
import { Stepper } from "@/components/domain/stepper";
import { FieldError } from "@/components/feedback/field-error";
import { Icon } from "@/components/icons";
import { ButtonLink, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SpaBookingSummary } from "@/features/booking/components/spa-booking-summary";
import {
  getApplicableServices,
  getInitialPetId,
  keepApplicableServiceIds,
  SERVICE_REQUIRED_MESSAGE,
  type SpaBookingStep1Values,
} from "@/features/booking/forms";
import { MOCK_PETS, MOCK_SERVICES } from "@/features/booking/mock-data";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";

const BOOKING_STEPS = ["Thú cưng & dịch vụ", "Chọn khung giờ", "Xác nhận"] as const;
const SERVICE_ERROR_ID = "spa-booking-service-error";

export function SpaBookingScreen() {
  const pets = MOCK_PETS;
  const services = MOCK_SERVICES;

  const searchParams = useSearchParams();
  const { control, handleSubmit, setValue, getValues } = useForm<SpaBookingStep1Values>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: { petId: getInitialPetId(pets, searchParams.get("petId")), serviceIds: [] },
  });
  const petId = useWatch({ control, name: "petId" });
  const serviceIds = useWatch({ control, name: "serviceIds" });

  function handleContinue() {
    // Chuyển sang bước tiếp theo khi hoàn thành chọn dịch vụ
  }

  const header = (
    <div className="mb-6">
      <h1>Đặt lịch spa</h1>
      <p className="mt-1 text-muted">Bạn chọn bé, dịch vụ và giờ. Cửa hàng xếp nhân viên khi xác nhận.</p>
    </div>
  );

  const pet = pets.find((item) => item.petId === petId);
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

  const applicable = getApplicableServices(services, pet);
  const selected = applicable.filter(({ service }) => serviceIds.includes(service.serviceId));

  return (
    <>
      {header}
      <form onSubmit={handleSubmit(handleContinue)} noValidate>
        <Stepper steps={BOOKING_STEPS} current={1} />
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
                          onChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, service.serviceId]
                                : field.value.filter((id) => id !== service.serviceId),
                            )
                          }
                        />
                      ))}
                      <FieldError id={SERVICE_ERROR_ID} message={fieldState.error?.message} />
                    </fieldset>
                  )}
                />
              </CardBody>
            </Card>
          </div>

          <SpaBookingSummary pet={pet} selected={selected} />
        </div>
      </form>
    </>
  );
}

