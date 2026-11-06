"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { getRemainingSeconds } from "@/features/service-execution/execution";
import { formatCountdown } from "@/lib/format";
import type { CostConfirmation, SizeGroup } from "@/lib/api/types";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

type CostConfirmationAlertProps = {
  currentSizeGroup: SizeGroup;
  confirmation: CostConfirmation;
};

// SW-11 vùng 6 – Chờ xác nhận chi phí (UI-Screens.md). Đếm ngược theo `expiresAt` của backend; hết giờ chỉ dừng ở 00:00,
// backend tự hủy lịch, web không tự đổi trạng thái (SA 6.6).
export function CostConfirmationAlert({ currentSizeGroup, confirmation }: CostConfirmationAlertProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const remaining = getRemainingSeconds(confirmation.expiresAt, nowMs);
  const isExpired = remaining === 0;

  useEffect(() => {
    if (isExpired) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isExpired]);

  return (
    <Alert tone="warn" icon="scale">
      Đang chờ khách xác nhận chi phí mới ({SIZE_GROUP_LABELS[currentSizeGroup]} → {SIZE_GROUP_LABELS[confirmation.newSizeGroup]}), còn{" "}
      {/* Không đọc lại mỗi giây (Design-System 7). */}
      <span role="timer" aria-live="off" className="font-semibold tabular-nums">
        {formatCountdown(remaining)}
      </span>
      .
    </Alert>
  );
}
