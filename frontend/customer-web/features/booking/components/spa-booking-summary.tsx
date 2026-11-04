import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { SumLine, SumTotal, SummaryCard } from "@/components/domain/summary-card";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { summarizeSelection, type ApplicableService, type BookingStep } from "@/features/booking/forms";
import type { Pet } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

type SpaBookingSummaryProps = {
  pet: Pet;
  selected: ApplicableService[];
  step: BookingStep;
  /** Bước 1: tính ở web để xem; bước 2–3: lấy từ GET /spa/slots. */
  durationMinutes: number;
  staffRequired: number;
  /** "06/10, 14:00 – 16:00"; null khi chưa chọn mốc giờ. */
  timeText: string | null;
  isSubmitting: boolean;
  submitError: unknown;
  onBack: () => void;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-[3px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function SpaBookingSummary({
  pet,
  selected,
  step,
  durationMinutes,
  staffRequired,
  timeText,
  isSubmitting,
  submitError,
  onBack,
}: SpaBookingSummaryProps) {
  const { totalPrice } = summarizeSelection(pet, selected);

  return (
    <SummaryCard
      title="Tóm tắt lịch hẹn"
      footer={
        <>
          {step === 3 && submitError ? <ErrorAlert error={submitError} /> : null}
          {step === 1 && (
            <Button type="submit" size="lg" block>
              Tiếp tục: chọn khung giờ
            </Button>
          )}
          {step === 2 && (
            <>
              <Button type="submit" size="lg" block>
                Tiếp tục: xác nhận
              </Button>
              <Button variant="ghost" block onClick={onBack}>
                Quay lại
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button type="submit" size="lg" block loading={isSubmitting}>
                Gửi yêu cầu đặt lịch
              </Button>
              <Button variant="ghost" block onClick={onBack} disabled={isSubmitting}>
                Quay lại
              </Button>
              <p className="text-center text-xs text-muted">
                Lịch hẹn ở trạng thái <StatusBadge status="Pending" /> cho đến khi cửa hàng xác nhận.
              </p>
            </>
          )}
        </>
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
            <SumLine key={service.serviceId} title={service.name} meta={`${pricing.durationMinutes} phút`} amount={pricing.price} />
          ))}
          <div className="mt-2 rounded-xl bg-mist px-4 py-2.5 text-xs">
            <SummaryRow label="Thời lượng" value={`${durationMinutes} phút`} />
            <SummaryRow label="Số nhân viên cần" value={String(staffRequired)} />
            {timeText && <SummaryRow label="Thời gian" value={timeText} />}
          </div>
        </>
      )}
      <SumTotal label="Tạm tính" amount={totalPrice} note="Chưa gồm thay đổi khi cân thực tế" />
    </SummaryCard>
  );
}
