"use client";

import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { useDashboardSnapshot } from "@/features/dashboard/use-dashboard-snapshot";
import { isForbiddenError } from "@/lib/api/errors";

// MW-02 – Dữ liệu spa lấy từ API thật; chuồng, khoản chưa thanh toán, lịch lưu trú vẫn là dữ liệu mô phỏng cho tới khi nối API riêng.
export function DashboardScreen() {
  const result = useDashboardSnapshot();
  if (result.status === "success") return <DashboardView snapshot={result.snapshot} />;
  return (
    <div className="flex flex-col gap-5">
      <h1>Tổng quan hôm nay</h1>
      {result.status === "pending" ? (
        <p role="status" aria-busy="true" className="text-muted">
          Đang tải tổng quan…
        </p>
      ) : isForbiddenError(result.error) ? (
        <ForbiddenState />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={result.error} className="w-full" />
          <Button variant="secondary" onClick={result.retry}>
            Thử lại
          </Button>
        </div>
      )}
    </div>
  );
}
