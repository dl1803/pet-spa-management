import { PetAvatar } from "@/components/domain/pet-avatar";
import { SummaryCard, SumTotal } from "@/components/domain/summary-card";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import type { HotelPricingRow, Pet } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

// Kết quả kiểm tra chỗ do server trả; web không tự tính.
export type HotelQuote = { nights: number; estimatedAmount: number };

type HotelBookingSummaryProps = {
  pet: Pet;
  rate: HotelPricingRow | null;
  lateFeePerBlock: number;
  // "T6 16/10, 09:00"; null khi chưa nhập đủ ngày và giờ.
  checkInText: string | null;
  checkOutText: string | null;
  // Ngày trả không sau ngày nhận: hiện "Chưa hợp lệ" ở dòng Trả.
  checkOutInvalid: boolean;
  quote: HotelQuote | null;
  submitError: unknown;
  isSubmitting: boolean;
  // Lý do khóa nút gửi; null khi được gửi.
  lockReason: string | null;
};

type SummaryRowProps = { label: string; value: string; invalid?: boolean };

function SummaryRow({ label, value, invalid = false }: SummaryRowProps) {
  return (
    <div className="flex justify-between gap-4 py-[3px]">
      <span className="text-muted">{label}</span>
      <span className={`text-right font-medium ${invalid ? "text-danger" : ""}`}>{value}</span>
    </div>
  );
}

export function HotelBookingSummary({
  pet,
  rate,
  lateFeePerBlock,
  checkInText,
  checkOutText,
  checkOutInvalid,
  quote,
  submitError,
  isSubmitting,
  lockReason,
}: HotelBookingSummaryProps) {
  const formula =
    quote === null
      ? ""
      : rate === null
        ? `${quote.nights} đêm`
        : `${quote.nights} × (${formatMoney(rate.pricePerNight)} + ${formatMoney(rate.foodPerNight)})`;

  return (
    <SummaryCard
      title="Tạm tính"
      footer={
        <>
          <ErrorAlert error={submitError} className="mb-3" />
          <Button
            type="submit"
            block
            size="lg"
            loading={isSubmitting}
            disabled={lockReason !== null}
            aria-describedby={lockReason !== null ? "hotel-lock-reason" : undefined}
          >
            Gửi yêu cầu lưu trú
          </Button>
          {lockReason !== null && (
            <p id="hotel-lock-reason" className="mt-2 text-center text-xs text-muted">
              {lockReason}
            </p>
          )}
        </>
      }
    >
      <div className="flex items-center gap-3">
        <PetAvatar species={pet.species} />
        <div className="min-w-0">
          <div className="font-semibold">{pet.name}</div>
          <div className="text-xs text-muted">{`${SPECIES_LABELS[pet.species]}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`}</div>
        </div>
      </div>
      <div className="my-4 h-px bg-line" />
      <div>
        <SummaryRow label="Nhận" value={checkInText ?? "—"} />
        <SummaryRow
          label="Trả"
          value={checkOutInvalid ? "Chưa hợp lệ" : (checkOutText ?? "—")}
          invalid={checkOutInvalid}
        />
        <SummaryRow label="Số đêm" value={quote === null ? "—" : String(quote.nights)} />
        <SummaryRow label="Chỗ ở / đêm" value={rate === null ? "—" : formatMoney(rate.pricePerNight)} />
        <SummaryRow label="Thức ăn / đêm" value={rate === null ? "—" : formatMoney(rate.foodPerNight)} />
      </div>
      {quote !== null && <SumTotal label="Tiền lưu trú" amount={quote.estimatedAmount} note={formula} />}
      <p className="mt-3 text-xs leading-[18px] text-muted">
        Thanh toán tại quầy khi gửi bé. Cửa hàng cân lại bé khi tiếp nhận nên số tiền có thể thay đổi.
        {lateFeePerBlock > 0 &&
          ` Đón trễ quá 30 phút tính phí ${formatMoney(lateFeePerBlock)} cho mỗi 60 phút.`}
      </p>
    </SummaryCard>
  );
}

