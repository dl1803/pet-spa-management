import { PetAvatar } from "@/components/domain/pet-avatar";
import { ChoiceCard } from "@/components/ui/choice-card";
import type { Pet } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

type HotelPetPickerProps = {
  pets: Pet[];
  selectedPetId: string;
  onSelect: (petId: string) => void;
};

export function HotelPetPicker({ pets, selectedPetId, onSelect }: HotelPetPickerProps) {
  return (
    <fieldset>
      <legend className="sr-only">Chọn thú cưng</legend>
      <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
        {pets.map((item) => (
          <ChoiceCard
            key={item.petId}
            name="petId"
            value={item.petId}
            checked={item.petId === selectedPetId}
            onChange={() => onSelect(item.petId)}
          >
            <PetAvatar species={item.species} />
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs text-muted">
                {`${SPECIES_LABELS[item.species]} ${item.breed}, nhóm ${SIZE_GROUP_LABELS[item.sizeGroup]}`}
              </div>
            </div>
          </ChoiceCard>
        ))}
      </div>
    </fieldset>
  );
}

