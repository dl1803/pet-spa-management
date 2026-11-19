import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { describeCageKind, getCageState, type CageState } from "@/features/reception-cages/cages";
import type { Cage } from "@/lib/api/types";
import { formatShortDate, formatTime } from "@/lib/format";
import { SPECIES_LABELS } from "@/lib/labels";

const STATE_LABELS: Record<CageState, string> = {
  empty: "Trống",
  occupied: "Đang chứa",
  inactive: "Ngừng sử dụng",
};

const PILL_CLASS: Record<CageState, string> = {
  empty: "bg-success-50 text-success",
  occupied: "bg-st-active-bg text-st-active",
  inactive: "bg-line-soft text-muted",
};

type CageCardProps = {
  cage: Cage;
  // Có giá trị khi chuồng đang chứa thú cưng trả trong hôm nay: thẻ viền cam và có nút Trả thú cưng.
  returnHref: string | null;
};

function getBoxClass(state: CageState, isReturnToday: boolean) {
  if (state === "empty") return "border-line bg-[repeating-linear-gradient(135deg,#fff_0_10px,#F8FBFB_10px_20px)]";
  if (state === "inactive") return "border-line bg-[#F1F4F5] text-muted";
  return isReturnToday ? "border-apricot bg-white" : "border-[#A6D3D7] bg-white";
}

export function CageCard({ cage, returnHref }: CageCardProps) {
  const state = getCageState(cage);
  const occupant = state === "occupied" ? (cage.occupant ?? null) : null;
  return (
    <li className={`flex min-h-[168px] flex-col gap-2.5 rounded-2xl border p-3.5 ${getBoxClass(state, returnHref !== null)}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{cage.code}</span>
        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${PILL_CLASS[state]}`}>
          {STATE_LABELS[state]}
        </span>
      </div>
      <div className="text-xs text-muted">{describeCageKind(cage)}</div>

      {occupant !== null && (
        <>
          <div className="flex items-center gap-2.5">
            <PetAvatar species={cage.species} size="sm" />
            <div className="min-w-0">
              <div className="font-semibold">{occupant.petName}</div>
              <div className="break-words text-xs text-muted">{`${SPECIES_LABELS[cage.species]}. Chủ: ${occupant.customerName}`}</div>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted">
            <Icon name="timer" className="size-3.5 shrink-0" />
            {returnHref !== null ? (
              <>
                <span className="font-semibold text-apricot-700">{`Trả hôm nay ${formatTime(occupant.plannedCheckOut)}`}</span>
                <div className="ml-auto">
                  <ButtonLink href={returnHref} variant="secondary" size="sm" aria-label={`Trả thú cưng ${occupant.petName}`}>
                    Trả thú cưng
                  </ButtonLink>
                </div>
              </>
            ) : (
              <span>{`Trả dự kiến ${formatTime(occupant.plannedCheckOut)}, ${formatShortDate(occupant.plannedCheckOut)}`}</span>
            )}
          </div>
        </>
      )}

      {state === "inactive" && <div className="mt-auto text-xs">Không tính vào sức chứa</div>}
    </li>
  );
}
