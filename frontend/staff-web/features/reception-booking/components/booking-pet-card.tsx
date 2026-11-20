import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PetChoiceList } from "@/features/reception-booking/components/pet-choice-list";
import type { Pet } from "@/lib/api/types";

type BookingPetCardProps = {
  pets: Pet[];
  selectedPetId: string;
  onSelect: (petId: string) => void;
  addPetHref: string;
};

export function BookingPetCard({ pets, selectedPetId, onSelect, addPetHref }: BookingPetCardProps) {
  return (
    <Card>
      <CardHeader title="Thú cưng">
        <ButtonLink href={addPetHref} variant="ghost" size="sm">
          <Icon name="plus" className="size-3.5" />
          Thêm thú cưng
        </ButtonLink>
      </CardHeader>
      <CardBody>
        <PetChoiceList pets={pets} selectedPetId={selectedPetId} onSelect={onSelect} />
      </CardBody>
    </Card>
  );
}
