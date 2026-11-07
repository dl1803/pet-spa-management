import { PetAvatar } from "@/components/domain/pet-avatar";
import { ChoiceCard } from "@/components/ui/choice-card";
import type { Pet } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";

type PetChoiceListProps = {
  pets: Pet[];
  selectedPetId: string;
  onSelect: (petId: string) => void;
};

export function PetChoiceList({ pets, selectedPetId, onSelect }: PetChoiceListProps) {
  return (
    <fieldset>
      <legend className="sr-only">Chọn thú cưng</legend>
      <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
        {pets.map((pet) => (
          <ChoiceCard
            key={pet.petId}
            name="petId"
            value={pet.petId}
            checked={pet.petId === selectedPetId}
            onChange={() => onSelect(pet.petId)}
          >
            <PetAvatar species={pet.species} />
            <div className="min-w-0">
              <div className="font-semibold">{pet.name}</div>
              <div className="text-xs text-muted">
                {`${SPECIES_LABELS[pet.species]} ${pet.breed}, ${formatWeight(pet.weightKg)}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}, ${TEMPERAMENT_LABELS[pet.temperament].toLocaleLowerCase("vi-VN")}`}
              </div>
            </div>
          </ChoiceCard>
        ))}
      </div>
    </fieldset>
  );
}

