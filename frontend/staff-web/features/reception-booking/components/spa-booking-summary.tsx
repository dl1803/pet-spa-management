import { PetAvatar } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import type { ApplicableService } from "@/features/reception-booking/spa-forms";
import type { Pet } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

type SpaBookingSummaryProps = {
  pet: Pet;
  selected: ApplicableService[];
  timeText: string | null;
  staffText: string | null;
  totalPrice: number;
  isSubmitting: boolean;
  submitError: unknown;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-[3px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function SpaBookingSummary({
  pet,
  selected,
  timeText,
  staffText,
  totalPrice,
  isSubmitting,
  submitError,
}: SpaBookingSummaryProps) {
  return (
    <aside>
      <Card>
        <CardHeader title="Tóm tắt" />
        <CardBody>
          <div className="flex items-center gap-3">
            <PetAvatar species={pet.species} />
            <div className="min-w-0">
              <div className="font-semibold">{pet.name}</div>
              <div className="text-xs text-muted">{`${SPECIES_LABELS[pet.species]} ${pet.breed}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`}</div>
            </div>
          </div>
          <div className="my-4 h-px bg-line" />
          {selected.length === 0 ? (
            <p className="text-muted">Chưa chọn dịch vụ.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {selected.map(({ service, pricing }) => (
                <li key={service.serviceId} className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{service.name}</div>
                    <div className="text-xs text-muted">{pricing.durationMinutes} phút</div>
                  </div>
                  <span className="whitespace-nowrap font-semibold tabular-nums">{formatMoney(pricing.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-xl bg-mist px-3.5 py-2.5 text-[13px]">
            <SummaryRow label="Thời gian" value={timeText ?? "—"} />
            <SummaryRow label="Số nhân viên cần" value={staffText ?? "—"} />
          </div>
          {selected.length > 0 && (
            <div className="mt-3.5 grid grid-cols-[1fr_auto] items-baseline gap-x-3 border-t border-dashed border-line pt-3.5">
              <div className="font-semibold">Tạm tính</div>
              <span className="whitespace-nowrap text-right text-[22px] font-bold leading-7 tabular-nums">{formatMoney(totalPrice)}</span>
            </div>
          )}
        </CardBody>
        <CardFooter className="flex-col items-stretch">
          <ErrorAlert error={submitError} />
          <Button type="submit" size="lg" block loading={isSubmitting}>
            Tạo lịch hẹn spa
          </Button>
          <p className="text-center text-xs text-muted">Lịch tạo ra ở trạng thái Chờ xác nhận.</p>
        </CardFooter>
      </Card>
    </aside>
  );
}
