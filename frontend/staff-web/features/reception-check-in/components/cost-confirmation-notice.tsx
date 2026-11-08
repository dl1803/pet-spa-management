"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Icon } from "@/components/icons";
import { getRemainingSeconds } from "@/features/reception-check-in/check-in";
import { formatKg, formatWeightDifference } from "@/features/reception-check-in/weight";
import { formatCountdown, formatMoney } from "@/lib/format";
import type { CostConfirmation, SizeGroup } from "@/lib/api/types";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

type CountdownProps = {
  expiresAt: string;
  onExpire: () => void;
};

// Đếm ngược theo thời hạn của backend. Về 0 chỉ kích hoạt tải lại dữ liệu.
function Countdown({ expiresAt, onExpire }: CountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const remaining = getRemainingSeconds(expiresAt, nowMs);
  const isExpired = remaining === 0;
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (isExpired) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isExpired]);

  useEffect(() => {
    if (isExpired) onExpireRef.current();
  }, [isExpired]);

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label="Thời gian còn lại để khách phản hồi"
      className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 align-middle text-[13px] font-semibold tabular-nums text-white"
    >
      <Icon name="timer" className="size-3.5" />
      {formatCountdown(remaining)}
    </span>
  );
}

type CostConfirmationNoticeProps = {
  confirmation: CostConfirmation;
  currentSizeGroup: SizeGroup;
  declaredWeightKg: number;
  onExpire: () => void;
};

export function CostConfirmationNotice({ confirmation, currentSizeGroup, declaredWeightKg, onExpire }: CostConfirmationNoticeProps) {
  return (
    <Alert
      tone="warn"
      icon="scale"
      title={`Tăng nhóm kích cỡ: ${SIZE_GROUP_LABELS[currentSizeGroup]} → ${SIZE_GROUP_LABELS[confirmation.newSizeGroup]}`}
    >
      Chênh {formatWeightDifference(confirmation.actualWeightKg, declaredWeightKg)}, vượt ngưỡng dung sai. Chi phí tăng từ{" "}
      {formatMoney(confirmation.oldAmount)} lên <b className="font-semibold">{formatMoney(confirmation.newAmount)}</b>. Đã gửi yêu
      cầu xác nhận cho khách <Countdown expiresAt={confirmation.expiresAt} onExpire={onExpire} />
      <div className="mt-1 text-xs text-muted">
        Khách đồng ý thì lịch tiếp tục và hồ sơ cập nhật {formatKg(confirmation.actualWeightKg)}. Khách từ chối hoặc quá hạn phản hồi,
        lịch tự động hủy.
      </div>
    </Alert>
  );
}

