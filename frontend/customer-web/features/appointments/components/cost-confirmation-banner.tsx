"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getRemainingSeconds } from "@/features/appointments/cost-confirmation";
import type { CostConfirmation, SizeGroup } from "@/lib/api/types";
import { formatCountdown, formatMoney, formatTime, formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

type CountdownProps = {
  expiresAt: string;
  onExpire: () => void;
};

// Đếm ngược theo hạn của backend. Về 0 chỉ kích hoạt tải lại dữ liệu, không tự hủy lịch ở web.
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
      aria-label="Thời gian còn lại để phản hồi"
      className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-[13px] font-semibold tabular-nums text-white"
    >
      <Icon name="timer" className="size-3.5" />
      {formatCountdown(remaining)}
    </span>
  );
}

type CostConfirmationBannerProps = {
  confirmation: CostConfirmation;
  petName: string;
  // Cân nặng và nhóm trong hồ sơ thú cưng; null khi hồ sơ chưa tải xong.
  currentWeightKg: number | null;
  currentSizeGroup: SizeGroup | null;
  isResponding: boolean;
  isAccepting: boolean;
  error: unknown;
  onAccept: () => void;
  onReject: () => void;
  onExpire: () => void;
};

export function CostConfirmationBanner({
  confirmation,
  petName,
  currentWeightKg,
  currentSizeGroup,
  isResponding,
  isAccepting,
  error,
  onAccept,
  onReject,
  onExpire,
}: CostConfirmationBannerProps) {
  const titleId = useId();
  const profileWeight = currentWeightKg === null ? "" : ` (hồ sơ: ${formatWeight(currentWeightKg)})`;
  const fromGroup = currentSizeGroup === null ? "sang nhóm" : `từ nhóm ${SIZE_GROUP_LABELS[currentSizeGroup]} sang nhóm`;

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-[#F1D9A2] bg-apricot-50 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-apricot text-white">
          <Icon name="scale" className="size-6" />
        </span>
        <div className="min-w-0 flex-1 basis-[320px]">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={titleId} className="text-[16px] leading-6">
              Cần bạn xác nhận chi phí mới
            </h2>
            <Countdown key={confirmation.expiresAt} expiresAt={confirmation.expiresAt} onExpire={onExpire} />
          </div>
          <p className="mt-1 leading-[22px]">
            {petName} nặng <b className="font-semibold">{formatWeight(confirmation.actualWeightKg)}</b> khi cân tại cửa hàng
            {profileWeight}, chuyển {fromGroup}{" "}
            <b className="font-semibold">{SIZE_GROUP_LABELS[confirmation.newSizeGroup]}</b>. Từ chối hoặc không phản hồi trước{" "}
            {formatTime(confirmation.expiresAt)}, lịch hẹn sẽ bị hủy.
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="sr-only">Chi phí cũ</span>
            <s className="text-muted">{formatMoney(confirmation.oldAmount)}</s>
            <span aria-hidden="true">→</span>
            <span className="sr-only">chi phí mới</span>
            <strong className="text-[22px] leading-7">{formatMoney(confirmation.newAmount)}</strong>
          </p>
        </div>
        <div className="flex w-[200px] flex-col gap-2 max-[640px]:w-full">
          <Button block loading={isAccepting} disabled={isResponding} onClick={onAccept}>
            Đồng ý chi phí mới
          </Button>
          <Button variant="danger" block disabled={isResponding} onClick={onReject}>
            Từ chối
          </Button>
        </div>
      </div>
      <ErrorAlert error={error} className="mt-4" />
    </section>
  );
}
