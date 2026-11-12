import { PetAvatar } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { Pet } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

const LOCK_REASON_ID = "change-lock-reason";

export function SummaryRow({ label, value, invalid = false }: { label: string; value: string; invalid?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-[3px]">
      <span className="text-muted">{label}</span>
      <span className={`text-right font-medium ${invalid ? "text-danger" : ""}`}>{value}</span>
    </div>
  );
}

export function SummaryPet({ pet }: { pet: Pet }) {
  return (
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
  );
}

type ChangeSummaryFooterProps = {
  submitError: unknown;
  isSubmitting: boolean;
  // Lý do khóa nút gửi; null khi được gửi.
  lockReason: string | null;
  // Đường dẫn của nút "Giữ lịch hiện tại" (chi tiết lịch hẹn).
  keepHref: string;
};

export function ChangeSummaryFooter({ submitError, isSubmitting, lockReason, keepHref }: ChangeSummaryFooterProps) {
  return (
    <>
      <ErrorAlert error={submitError} className="mb-3" />
      <Button
        type="submit"
        size="lg"
        block
        loading={isSubmitting}
        disabled={lockReason !== null}
        aria-describedby={lockReason !== null ? LOCK_REASON_ID : undefined}
      >
        Gửi yêu cầu đổi lịch
      </Button>
      {lockReason !== null && (
        <p id={LOCK_REASON_ID} className="mt-2 flex items-start justify-center gap-1.5 text-xs text-muted">
          <Icon name="lock" className="mt-px size-3.5 shrink-0" />
          {lockReason}
        </p>
      )}
      <ButtonLink href={keepHref} variant="ghost" block>
        Giữ lịch hiện tại
      </ButtonLink>
    </>
  );
}

