import { PetAvatar } from "@/components/domain/pet-avatar";
import { SumLine, SumTotal, SummaryCard } from "@/components/domain/summary-card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { Pet } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { summarizeSelection, type ApplicableService } from "@/features/booking/forms";

type SpaBookingSummaryProps = {
  pet: Pet;
  selected: ApplicableService[];
};

export function SpaBookingSummary({ pet, selected }: SpaBookingSummaryProps) {
  const { totalPrice, totalMinutes, staffRequired } = summarizeSelection(pet, selected);

  return (
    <SummaryCard
      title="Tóm tắt lịch hẹn"
      footer={
        <Button type="submit" size="lg" block>
          Tiếp tục: chọn khung giờ
        </Button>
      }
    >
      <div className="flex items-center gap-3">
        <PetAvatar species={pet.species} />
        <div className="min-w-0">
          <div className="font-semibold">{pet.name}</div>
          <div className="text-xs text-muted">{`${SPECIES_LABELS[pet.species]}, ${pet.breed}, ${formatWeight(pet.weightKg)}`}</div>
        </div>
        <span className="ml-auto">
          <Tag tone="size">Nhóm {SIZE_GROUP_LABELS[pet.sizeGroup]}</Tag>
        </span>
      </div>
      <div className="my-4 h-px bg-line" />
      {selected.length === 0 ? (
        <p className="text-xs text-muted">Chưa chọn dịch vụ.</p>
      ) : (
        <>
          {selected.map(({ service, pricing }) => (
            <SumLine
              key={service.serviceId}
              title={service.name}
              meta={`${pricing.durationMinutes} phút`}
              amount={pricing.price}
            />
          ))}
          <div className="mt-2 rounded-xl bg-mist px-4 py-2.5 text-xs">
            <div className="flex justify-between gap-4 py-[3px]">
              <span className="text-muted">Thời lượng</span>
              <span className="font-medium">{totalMinutes} phút</span>
            </div>
            <div className="flex justify-between gap-4 py-[3px]">
              <span className="text-muted">Số nhân viên cần</span>
              <span className="font-medium">{staffRequired}</span>
            </div>
          </div>
        </>
      )}
      <SumTotal label="Tạm tính" amount={totalPrice} note="Chưa gồm thay đổi khi cân thực tế" />
    </SummaryCard>
  );
}

