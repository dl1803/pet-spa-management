"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { PetFormFields } from "@/features/reception-customers/components/pet-form-fields";
import { SizeEstimateCard } from "@/features/reception-customers/components/size-estimate-card";
import {
  isDog,
  parseDecimal,
  PET_FORM_DEFAULT_VALUES,
  PET_SAVED_MESSAGE,
  toPetFormValues,
  toPetRequest,
  type PetFormValues,
} from "@/features/reception-customers/forms";
import { mockCreatePet, mockUpdatePet, PETS_QUERY_KEY } from "@/features/reception-customers/mock-api";
import type { Pet, Species } from "@/lib/api/types";
import { ROUTES, withQuery } from "@/lib/routes";
import type { ServingCustomer } from "@/lib/serving-customer";
import { estimateSize } from "@/lib/size-estimate";

type PetProfileFormProps = {
  customer: ServingCustomer;
  // Có pet là sửa hồ sơ; không có là tạo mới.
  pet?: Pet;
};

// SW-05: form tạo/sửa hồ sơ thú cưng thay khách và thẻ nhóm kích cỡ dự kiến.
export function PetProfileForm({ customer, pet }: PetProfileFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const isEditing = pet !== undefined;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<PetFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: pet ? toPetFormValues(pet) : PET_FORM_DEFAULT_VALUES,
  });
  const [species, temperament, weight, height] = useWatch({
    control,
    name: ["species", "temperament", "weight", "height"],
  });
  const estimate = estimateSize({
    species,
    weightKg: parseDecimal(weight),
    heightCm: isDog(species) ? parseDecimal(height) : null,
  });

  const createPet = useMutation({ mutationFn: mockCreatePet });
  const updatePet = useMutation({ mutationFn: mockUpdatePet });
  const isPending = createPet.isPending || updatePet.isPending;

  function handleSpeciesChange(next: Species) {
    setValue("species", next, { shouldDirty: true });
    // Chiều cao chỉ bắt buộc với chó: bỏ lỗi cũ khi đổi loài.
    clearErrors("height");
  }

  function onSubmit(values: PetFormValues) {
    if (isPending) return;

    if (pet) {
      const request = toPetRequest(values);
      if (request === null) return;
      updatePet.mutate(
        { petId: pet.petId, request },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PETS_QUERY_KEY });
            showSuccess(PET_SAVED_MESSAGE);
            router.push(withQuery(ROUTES.customers, { search: customer.phone }));
          },
        },
      );
      return;
    }

    const request = toPetRequest(values, customer.customerId);
    if (request === null) return;
    createPet.mutate(request, {
      onSuccess: (created) => {
        void queryClient.invalidateQueries({ queryKey: PETS_QUERY_KEY });
        showSuccess(PET_SAVED_MESSAGE);
        router.push(withQuery(ROUTES.booking, { customerId: customer.customerId, petId: created.petId }));
      },
    });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardBody>
            <div className="flex flex-col gap-6">
              <ErrorAlert error={isEditing ? updatePet.error : createPet.error} />
              <PetFormFields
                register={register}
                errors={errors}
                species={species}
                temperament={temperament}
                isEditing={isEditing}
                onSpeciesChange={handleSpeciesChange}
                onTemperamentChange={(next) => setValue("temperament", next, { shouldDirty: true })}
              />
            </div>
          </CardBody>
          <CardFooter className="items-center justify-between">
            <ButtonLink href={ROUTES.customers} variant="ghost">
              Hủy bỏ
            </ButtonLink>
            <Button type="submit" loading={isPending} loadingText="Đang lưu…">
              {isEditing ? "Lưu hồ sơ" : "Lưu và đặt lịch"}
            </Button>
          </CardFooter>
        </Card>
      </form>
      <SizeEstimateCard species={species} estimate={estimate} />
    </div>
  );
}

