import { FieldError } from "@/components/feedback/field-error";
import type { Species } from "@/lib/api/types";
import { SPECIES_LABELS } from "@/lib/labels";
import { SPECIES_ORDER } from "../forms";

type SpeciesChipsProps = {
  value: Species[];
  onChange: (species: Species[]) => void;
  error?: string;
  errorId: string;
};

// Chọn nhiều loài áp dụng (MW-06·D1). Ô kiểm thật ẩn bên trong để chọn được bằng bàn phím (Design-System 7).
export function SpeciesChips({ value, onChange, error, errorId }: SpeciesChipsProps) {
  function handleToggle(species: Species) {
    onChange(value.includes(species) ? value.filter((item) => item !== species) : [...value, species]);
  }

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1.5 text-[13px] font-semibold leading-[18px]">
        Loài áp dụng<span aria-hidden="true" className="text-danger">*</span>
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {SPECIES_ORDER.map((species) => {
          const isSelected = value.includes(species);
          return (
            <label
              key={species}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lagoon/40 ${
                isSelected ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-control"
              }`}
            >
              <input type="checkbox" checked={isSelected} onChange={() => handleToggle(species)} className="sr-only" />
              {SPECIES_LABELS[species]}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
