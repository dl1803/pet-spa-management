import type { ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { isForbiddenError } from "@/lib/api/errors";

type HotelPricingGateProps = {
  // Đã có bảng giá từ GET /hotel/pricing (kể cả khi lần tải lại nền bị lỗi, giữ dữ liệu đang có).
  hasData: boolean;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  children: ReactNode;
};

// MW-07 tab Giá – chỉ cho nhập giá khi đã có dữ liệu từ server. Chưa tải xong, lỗi hoặc không có quyền thì hiện
// trạng thái tương ứng, không hiện form, để ô trống chưa tải không bị nhầm là giá chưa thiết lập.
export function HotelPricingGate({ hasData, isPending, error, onRetry, children }: HotelPricingGateProps) {
  if (hasData) return <>{children}</>;

  if (isPending) {
    return (
      <p role="status" aria-busy="true" className="text-muted">
        Đang tải bảng giá…
      </p>
    );
  }

  if (isForbiddenError(error)) return <ForbiddenState />;

  return (
    <div className="flex flex-col items-start gap-3">
      <ErrorAlert error={error} className="w-full" />
      <Button variant="secondary" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}
