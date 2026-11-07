import { PetAvatar } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import type { HotelPricingRow, Pet } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

const LOCK_REASON_ID = "hotel-booking-lock-reason";

type HotelBookingSummaryProps = {
  pet: Pet;
  checkInText: string | null;
  checkOutText: string | null;
  quote: { nights: number; estimatedAmount: number } | null;
  rate: HotelPricingRow | null;
  lockReason: string | null;
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

export function HotelBookingSummary({
  pet,
  checkInText,
  checkOutText,
  quote,
  rate,
  lockReason,
  isSubmitting,
  submitError,
}: HotelBookingSummaryProps) {
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
          <SummaryRow label="Nhận" value={checkInText ?? "—"} />
          <SummaryRow label="Trả" value={checkOutText ?? "—"} />
          <SummaryRow label="Số đêm" value={quote ? String(quote.nights) : "—"} />
          {quote && (
            <div className="mt-1.5 grid grid-cols-[1fr_auto] items-baseline gap-x-3 border-t border-dashed border-line pt-3.5">
              <div className="font-semibold">Tiền lưu trú</div>
              <span className="whitespace-nowrap text-right text-[22px] font-bold leading-7 tabular-nums">
                {formatMoney(quote.estimatedAmount)}
              </span>
              {rate && (
                <div className="col-span-full mt-0.5 text-xs text-muted">
                  {`${quote.nights} × (${formatMoney(rate.pricePerNight)} + ${formatMoney(rate.foodPerNight)})`}
                </div>
              )}
            </div>
          )}
        </CardBody>
        <CardFooter className="flex-col items-stretch">
          <ErrorAlert error={submitError} />
          <Button
            type="submit"
            size="lg"
            block
            loading={isSubmitting}
            disabled={lockReason !== null}
            aria-describedby={lockReason !== null ? LOCK_REASON_ID : undefined}
          >
            Tạo lịch lưu trú
          </Button>
          {lockReason !== null && (
            <p id={LOCK_REASON_ID} className="flex items-start gap-1.5 text-xs text-muted">
              <Icon name="lock" className="mt-px size-3.5" />
              {lockReason}
            </p>
          )}
          <p className="text-center text-xs text-muted">Lịch tạo ra ở trạng thái Chờ xác nhận.</p>
        </CardFooter>
      </Card>
    </aside>
  );
}

