import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SpeciesPicker } from "@/features/reception-customers/components/species-picker";
import {
  isDog,
  TEMPERAMENT_OPTIONS,
  validateCoatNote,
  validatePetBreed,
  validatePetHeight,
  validatePetName,
  validatePetNotes,
  validatePetWeight,
  type PetFormValues,
} from "@/features/reception-customers/forms";
import type { Species, Temperament } from "@/lib/api/types";
import { TEMPERAMENT_LABELS } from "@/lib/labels";

const WEIGHT_HINT_ID = "pet-weight-hint";
const HEIGHT_HINT_ID = "pet-height-hint";

function describedBy(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
}

type PetFormFieldsProps = {
  register: UseFormRegister<PetFormValues>;
  errors: FieldErrors<PetFormValues>;
  species: Species;
  temperament: Temperament;
  isEditing: boolean;
  onSpeciesChange: (species: Species) => void;
  onTemperamentChange: (temperament: Temperament) => void;
};

// SW-05 vùng 2–5: giống CW-05 vùng 2–5, thêm cảnh báo khi chọn tính cách “Khó tính, dữ”.
export function PetFormFields({
  register,
  errors,
  species,
  temperament,
  isEditing,
  onSpeciesChange,
  onTemperamentChange,
}: PetFormFieldsProps) {
  const dog = isDog(species);

  return (
    <div className="flex flex-col gap-6">
      <SpeciesPicker value={species} onChange={onSpeciesChange} />

      <div className="grid grid-cols-2 items-start gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
        <Field id="pet-name" label="Tên" required error={errors.name?.message}>
          {(control) => <Input {...control} autoComplete="off" {...register("name", { validate: validatePetName })} />}
        </Field>
        <Field id="pet-breed" label="Giống" required error={errors.breed?.message}>
          {(control) => (
            <Input {...control} autoComplete="off" {...register("breed", { validate: validatePetBreed })} />
          )}
        </Field>
        <div>
          <Field id="pet-weight" label="Cân nặng (kg)" required error={errors.weight?.message}>
            {(control) => (
              <Input
                {...control}
                aria-describedby={describedBy(control["aria-describedby"], isEditing ? WEIGHT_HINT_ID : undefined)}
                suffix="kg"
                inputMode="decimal"
                autoComplete="off"
                {...register("weight", { validate: validatePetWeight })}
              />
            )}
          </Field>
          {isEditing && (
            <p id={WEIGHT_HINT_ID} className="mt-1.5 text-xs text-muted">
              Cân nặng thực tế khi tiếp nhận sẽ cập nhật vào đây.
            </p>
          )}
        </div>
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
                aria-describedby={describedBy(control["aria-describedby"], dog ? HEIGHT_HINT_ID : undefined)}
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
              onChange={() => onTemperamentChange(option.value)}
            >
              <div>
                <div className="font-semibold">{TEMPERAMENT_LABELS[option.value]}</div>
                <div className="text-xs text-muted">{option.description}</div>
              </div>
            </ChoiceCard>
          ))}
        </div>
        {temperament === "Difficult" ? (
          <Alert tone="warn" className="mt-2.5">
            Bé khó tính cần 2 nhân viên, số mốc giờ còn chỗ có thể ít hơn. Hãy báo khách điều này khi chọn giờ.
          </Alert>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            Bé khó tính cần 2 nhân viên, số mốc giờ còn chỗ có thể ít hơn.
          </p>
        )}
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
  );
}

