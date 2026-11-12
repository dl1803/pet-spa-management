import type { ReactNode } from "react";
import { SumTotal, SummaryCard } from "@/components/domain/summary-card";
import { Alert } from "@/components/feedback/alert";
import { SummaryPet, SummaryRow } from "@/features/booking/components/change-summary-parts";
import type { HotelQuote } from "@/features/booking/components/hotel-booking-summary";
import type { Pet } from "@/lib/api/types";

type HotelChangeSummaryProps = {
  pet: Pet;
  // "T6 16/10, 09:00"; null khi chưa nhập đủ ngày và giờ.
  checkInText: string | null;
  checkOutText: string | null;
  // Ngày trả không sau ngày nhận: hiện "Chưa hợp lệ" ở dòng Trả.
  checkOutInvalid: boolean;
  // Kết quả kiểm tra chỗ do server trả; web không tự tính.
  quote: HotelQuote | null;
  footer: ReactNode;
};

export function HotelChangeSummary({ pet, checkInText, checkOutText, checkOutInvalid, quote, footer }: HotelChangeSummaryProps) {
  return (
    <SummaryCard title="Sau khi đổi" footer={footer}>
      <SummaryPet pet={pet} />
      <div className="my-4 h-px bg-line" />
      <div className="rounded-xl bg-mist px-4 py-2.5 text-xs">
        <SummaryRow label="Nhận" value={checkInText ?? "—"} />
        <SummaryRow
          label="Trả"
          value={checkOutInvalid ? "Chưa hợp lệ" : (checkOutText ?? "—")}
          invalid={checkOutInvalid}
        />
        <SummaryRow label="Số đêm" value={quote === null ? "—" : String(quote.nights)} />
      </div>
      {quote !== null && <SumTotal label="Tiền lưu trú" amount={quote.estimatedAmount} note="Tính lại khi cửa hàng duyệt" />}
      <Alert tone="warn" className="mt-4">
        Lịch sẽ về Chờ xác nhận để cửa hàng duyệt lại chuồng.
      </Alert>
    </SummaryCard>
  );
}

