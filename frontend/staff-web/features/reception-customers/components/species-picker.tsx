import { PetAvatar } from "@/components/domain/pet-avatar";
import { SPECIES_ORDER } from "@/features/reception-customers/forms";
import type { Species } from "@/lib/api/types";
import { SPECIES_LABELS } from "@/lib/labels";

type SpeciesPickerProps = {
  value: Species;
  onChange: (species: Species) => void;
};

// Chọn loài bằng 4 thẻ (hình + nhãn).
export function SpeciesPicker({ value, onChange }: SpeciesPickerProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold leading-[18px]">
        Loài
        <span aria-hidden="true" className="ml-0.5 text-danger">
          *
        </span>
      </legend>
      <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-2.5 max-[980px]:grid-cols-[repeat(2,minmax(0,1fr))]">
        {SPECIES_ORDER.map((species) => {
          const checked = species === value;
          return (
            <label
              key={species}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lagoon/40 ${
                checked
                  ? "border-lagoon bg-lagoon-25 shadow-[inset_0_0_0_1px_var(--color-lagoon)]"
                  : "border-line bg-white hover:border-[#A9C6CB]"
              }`}
            >
              <input
                type="radio"
                name="species"
                value={species}
                checked={checked}
                onChange={() => onChange(species)}
                className="sr-only"
              />
              <PetAvatar species={species} size="sm" />
              {SPECIES_LABELS[species]}
            </label>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">Cửa hàng chỉ phục vụ chó, mèo, thỏ, chuột lang.</p>
    </fieldset>
  );
}

