import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { describePet } from "@/features/reception-customers/forms";
import type { Pet } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";

type CustomerPetListProps = {
  customerId: string;
  pets: Pet[];
  onSelect: () => void;
};

// SW-04 vùng 2: khối “Thú cưng”; mỗi thẻ mở SW-05 để sửa hồ sơ.
export function CustomerPetList({ customerId, pets, onSelect }: CustomerPetListProps) {
  return (
    <section aria-labelledby={`pets-${customerId}`}>
      <h3 id={`pets-${customerId}`} className="mb-2.5">
        Thú cưng
      </h3>
      {pets.length === 0 ? (
        <p className="text-muted">Khách chưa có hồ sơ thú cưng.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 max-[860px]:grid-cols-1">
          {pets.map((pet) => (
            <li key={pet.petId}>
              <Link
                href={ROUTES.customerPetEdit(customerId, pet.petId)}
                onClick={onSelect}
                className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 transition-colors hover:border-[#A9C6CB]"
              >
                <PetAvatar species={pet.species} />
                <span className="min-w-0 grow">
                  <span className="block font-semibold text-lagoon-700">{pet.name}</span>
                  <span className="block text-xs text-muted">{describePet(pet)}</span>
                </span>
                <Icon name="chev-r" className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

