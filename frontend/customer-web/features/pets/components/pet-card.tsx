"use client";

import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { Dropdown, dropdownItemClass } from "@/components/layout/dropdown";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { isDog } from "@/features/pets/forms";
import type { Pet } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";
import { ROUTES, withQuery } from "@/lib/routes";
import { formatMeasure } from "@/lib/size-estimate";

type InfoCellProps = { label: string; value: string; muted?: boolean; tabular?: boolean };

function InfoCell({ label, value, muted = false, tabular = false }: InfoCellProps) {
  return (
    <div className="min-w-0 rounded-xl bg-mist px-3 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className={`break-words font-semibold ${tabular ? "tabular-nums" : ""} ${muted ? "text-muted" : ""}`}>
        {value}
      </div>
    </div>
  );
}

// Cao vai chỉ cần với chó; chó chưa có số liệu hiện “—”.
function getHeightCell(pet: Pet): InfoCellProps {
  if (!isDog(pet.species)) return { label: "Cao vai", value: "Không cần", muted: true };
  if (pet.heightCm === null || pet.heightCm === undefined) return { label: "Cao vai", value: "—" };
  return { label: "Cao vai", value: `${formatMeasure(pet.heightCm)} cm`, tabular: true };
}

type PetCardProps = {
  pet: Pet;
  onRemove: (pet: Pet) => void;
};

export function PetCard({ pet, onRemove }: PetCardProps) {
  const heightCell = getHeightCell(pet);

  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-4">
          <PetAvatar species={pet.species} size="lg" />
          <div className="min-w-0 grow">
            <h2 className="break-words">{pet.name}</h2>
            <div className="break-words text-muted">
              {SPECIES_LABELS[pet.species]} {pet.breed}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Tag tone="size">Nhóm {SIZE_GROUP_LABELS[pet.sizeGroup]}</Tag>
              <Tag>{TEMPERAMENT_LABELS[pet.temperament]}</Tag>
            </div>
          </div>
          <Dropdown
            align="right"
            buttonClassName="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-ink hover:bg-mist"
            label={
              <>
                <Icon name="dots" />
                <span className="sr-only">Thêm thao tác cho {pet.name}</span>
              </>
            }
          >
            <Link href={ROUTES.petEdit(pet.petId)} className={dropdownItemClass}>
              <Icon name="edit" />
              Sửa hồ sơ
            </Link>
            <Link href={withQuery(ROUTES.history, { petId: pet.petId })} className={dropdownItemClass}>
              <Icon name="history" />
              Lịch sử dịch vụ
            </Link>
            <div className="mx-1 my-1.5 h-px bg-line" />
            <button type="button" onClick={() => onRemove(pet)} className={`${dropdownItemClass} cursor-pointer text-danger`}>
              <Icon name="trash" />
              Gỡ hồ sơ
            </button>
          </Dropdown>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <InfoCell label="Cân nặng" value={formatWeight(pet.weightKg)} tabular />
          <InfoCell {...heightCell} />
          <InfoCell label="Lông" value={pet.coatNote ? pet.coatNote : "—"} />
        </div>

        {pet.notes && <p className="mt-3 break-words text-xs text-muted">Ghi chú: {pet.notes}</p>}
      </CardBody>
      <CardFooter>
        <ButtonLink href={withQuery(ROUTES.spaBooking, { petId: pet.petId })} variant="secondary" size="sm">
          Đặt lịch spa
        </ButtonLink>
        <ButtonLink href={ROUTES.petEdit(pet.petId)} variant="ghost" size="sm">
          Sửa hồ sơ
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}

