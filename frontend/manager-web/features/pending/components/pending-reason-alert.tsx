import { Alert } from "@/components/feedback/alert";
import { formatMoney } from "@/lib/format";
import { formatEventMoment, formatSlotMoment, type SpaPendingReason } from "../spa-summary";

type PendingReasonAlertProps = {
  reason: SpaPendingReason;
  // VND do server tính (số tiền sau khi xác nhận khi khách đã đổi lịch); chỉ hiển thị, không tính lại ở web.
  amount: number;
  // Thông tin hiện tại của lịch, để nêu “sang …” khi khách đổi lịch.
  slotStart: string;
  serviceNames: string[];
  hasAccount: boolean;
  className?: string;
};

// MW-04 vùng 7 – ghi chú lý do chờ xác nhận (UI-Screens.md, UI demo). Chỉ hiện khi có thông tin lý do (UI-Screens G-08).
export function PendingReasonAlert({ reason, amount, slotStart, serviceNames, hasAccount, className }: PendingReasonAlertProps) {
  if (reason.kind === "CustomerChanged") {
    return (
      <Alert tone="info" icon="calendar" title={`Khách đã đổi lịch lúc ${formatEventMoment(reason.changedAt)}`} className={className}>
        Từ {formatSlotMoment(reason.previousSlotStart)} ({reason.previousServiceNames.join(", ")}) sang {formatSlotMoment(slotStart)} (
        {serviceNames.join(", ")}). Khi xác nhận, số tiền tính lại: <b className="tabular-nums">{formatMoney(amount)}</b> (trước khi
        đổi {formatMoney(reason.previousAmount)}).
      </Alert>
    );
  }

  const removed = reason.removedStaffNames.length > 0 ? `, phân công cũ (${reason.removedStaffNames.join(", ")}) đã được gỡ` : "";
  return (
    <Alert tone="warn" icon="users" title="Cần phân công lại" className={className}>
      Nhân viên {reason.deactivatedStaffName} bị vô hiệu hóa lúc {formatEventMoment(reason.deactivatedAt)}. Lịch đã quay về Chờ
      xác nhận{removed}.{hasAccount ? " Khách hàng đã nhận thông báo." : ""}
    </Alert>
  );
}
