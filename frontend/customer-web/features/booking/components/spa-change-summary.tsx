import type { ReactNode } from "react";
import { SumTotal, SummaryCard } from "@/components/domain/summary-card";
import { Alert } from "@/components/feedback/alert";
import { SummaryPet, SummaryRow } from "@/features/booking/components/change-summary-parts";
import type { Pet } from "@/lib/api/types";

type SpaChangeSummaryProps = {
  pet: Pet;
  selectedCount: number;
  durationMinutes: number;
  // "T6 16/10, 14:00 – 16:00"; null khi chưa chọn khung giờ còn chỗ.
  timeText: string | null;
  totalPrice: number;
  footer: ReactNode;
};

export function SpaChangeSummary({ pet, selectedCount, durationMinutes, timeText, totalPrice, footer }: SpaChangeSummaryProps) {
  return (
    <SummaryCard title="Sau khi đổi" footer={footer}>
      <SummaryPet pet={pet} />
      <div className="my-4 h-px bg-line" />
      <div className="rounded-xl bg-mist px-4 py-2.5 text-xs">
        <SummaryRow label="Thời gian" value={timeText ?? "Chưa chọn"} />
        <SummaryRow
          label="Dịch vụ"
          value={selectedCount === 0 ? "Chưa chọn" : `${selectedCount} dịch vụ, ${durationMinutes} phút`}
        />
      </div>
      <SumTotal label="Tạm tính" amount={totalPrice} note="Tính lại khi cửa hàng duyệt" />
      <Alert tone="warn" className="mt-4">
        Lịch sẽ về Chờ xác nhận để cửa hàng duyệt lại nhân viên.
      </Alert>
    </SummaryCard>
  );
}

