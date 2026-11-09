"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { useToast } from "@/components/feedback/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SizeEstimateCard } from "@/features/pets/components/size-estimate-card";
import { SpeciesPicker } from "@/features/pets/components/species-picker";
import {
  isDog,
  parseDecimal,
  PET_FORM_DEFAULT_VALUES,
  PET_SAVED_MESSAGE,
  TEMPERAMENT_OPTIONS,
  toPetFormValues,
  toPetRequest,
  validateCoatNote,
  validatePetBreed,
  validatePetHeight,
  validatePetName,
  validatePetNotes,
  validatePetWeight,
  type PetFormValues,
} from "@/features/pets/forms";
import type { Pet, Species } from "@/lib/api/types";
import { TEMPERAMENT_LABELS } from "@/lib/labels";
import { useCreatePet, useUpdatePet } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { estimateSize } from "@/lib/size-estimate";

const LAYOUT_CLASS = "grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1";
const HEIGHT_HINT_ID = "pet-height-hint";

type PetFormProps = {
  // Có `pet` là sửa hồ sơ; không có là thêm mới.
  pet?: Pet;
};

// Tạo / sửa hồ sơ thú cưng. Không gửi sizeGroup (backend xác định).
export function PetForm({ pet }: PetFormProps) {
  const router = useRouter();
  const { showSuccess } = useToast();
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();
  const {
    register,
    handleSubmit,
    control: formControl,
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
    control: formControl,
    name: ["species", "temperament", "weight", "height"],
  });

  const dog = isDog(species);
  const estimate = estimateSize({
    species,
    weightKg: parseDecimal(weight),
    heightCm: dog ? parseDecimal(height) : null,
  });
  const isPending = createPet.isPending || updatePet.isPending;
  const error = pet ? updatePet.error : createPet.error;

  function handleSpeciesChange(next: Species) {
    setValue("species", next, { shouldDirty: true });
    // Ô chiều cao chỉ bắt buộc với chó: bỏ lỗi cũ khi đổi loài.
    clearErrors("height");
  }

  function onSubmit(values: PetFormValues) {
    if (isPending) return;
    const request = toPetRequest(values);
    if (request === null) return;

    const options = {
      onSuccess: () => {
        showSuccess(PET_SAVED_MESSAGE);
        router.replace(ROUTES.pets);
      },
    };
    if (pet) updatePet.mutate({ petId: pet.petId, request }, options);
    else createPet.mutate(request, options);
  }

  return (
    <div className={LAYOUT_CLASS}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardBody>
            <div className="flex flex-col gap-6">
              <ErrorAlert error={error} />

              <SpeciesPicker value={species} onChange={handleSpeciesChange} />

              <div className="grid grid-cols-2 items-start gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
                <Field id="pet-name" label="Tên" required error={errors.name?.message}>
                  {(control) => (
                    <Input {...control} autoComplete="off" {...register("name", { validate: validatePetName })} />
                  )}
                </Field>
                <Field id="pet-breed" label="Giống" required error={errors.breed?.message}>
                  {(control) => (
                    <Input {...control} autoComplete="off" {...register("breed", { validate: validatePetBreed })} />
                  )}
                </Field>
                <Field id="pet-weight" label="Cân nặng (kg)" required error={errors.weight?.message}>
                  {(control) => (
                    <Input
                      {...control}
                      suffix="kg"
                      inputMode="decimal"
                      autoComplete="off"
                      {...register("weight", { validate: validatePetWeight })}
                    />
                  )}
                </Field>
                <div>
                  <Field
                    id="pet-height"
                    label="Chiều cao vai (cm)"
                    required={dog}
                    note={dog ? undefined : "chỉ cần với chó"}
                    error={errors.height?.message}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        aria-describedby={
                          [control["aria-describedby"], dog ? HEIGHT_HINT_ID : undefined].filter(Boolean).join(" ") ||
                          undefined
                        }
                        suffix="cm"
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={!dog}
                        {...register("height", { validate: validatePetHeight })}
                      />
                    )}
                  </Field>
                  {dog && (
                    <p id={HEIGHT_HINT_ID} className="mt-1.5 text-xs text-muted">
                      Bắt buộc với chó, đo từ mặt đất tới vai.
                    </p>
                  )}
                </div>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-[13px] font-semibold leading-[18px]">
                  Tính cách
                  <span aria-hidden="true" className="ml-0.5 text-danger">
                    *
                  </span>
                </legend>
                <div className="grid grid-cols-3 gap-2.5 max-[980px]:grid-cols-1">
                  {TEMPERAMENT_OPTIONS.map((option) => (
                    <ChoiceCard
                      key={option.value}
                      name="temperament"
                      value={option.value}
                      checked={temperament === option.value}
                      onChange={() => setValue("temperament", option.value, { shouldDirty: true })}
                    >
                      <div>
                        <div className="font-semibold">{TEMPERAMENT_LABELS[option.value]}</div>
                        <div className="text-xs text-muted">{option.description}</div>
                      </div>
                    </ChoiceCard>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Bé khó tính cần 2 nhân viên, số mốc giờ còn chỗ có thể ít hơn.
                </p>
              </fieldset>

              <Field id="pet-coat-note" label="Đặc điểm lông" optional error={errors.coatNote?.message}>
                {(control) => (
                  <Input {...control} autoComplete="off" {...register("coatNote", { validate: validateCoatNote })} />
                )}
              </Field>
              <Field id="pet-notes" label="Ghi chú" note="tiền sử bệnh, lưu ý chăm sóc" optional error={errors.notes?.message}>
                {(control) => <Textarea {...control} rows={3} {...register("notes", { validate: validatePetNotes })} />}
              </Field>
            </div>
          </CardBody>
          <CardFooter className="items-center justify-between">
            <ButtonLink href={ROUTES.pets} variant="ghost">
              Hủy bỏ
            </ButtonLink>
            <Button type="submit" loading={isPending}>
              Lưu hồ sơ
            </Button>
          </CardFooter>
        </Card>
      </form>

      <SizeEstimateCard species={species} estimate={estimate} />
    </div>
  );
}

