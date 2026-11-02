import { Icon, type IconName } from "@/components/icons";
import type { Notification, NotificationType } from "@/lib/api/types";
import { formatRelativeDay } from "@/lib/format";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/labels";

// Ô biểu tượng theo `type` (UI-Screens mục 2.4), màu lấy từ token trạng thái lịch hẹn; CostConfirmation dùng Apricot.
const TYPE_ICONS: Record<NotificationType, { icon: IconName; className: string }> = {
  BookingReceived: { icon: "calendar-plus", className: "bg-st-pending-bg text-st-pending" },
  ConfirmedAssigned: { icon: "check-circle", className: "bg-st-confirmed-bg text-st-confirmed" },
  StatusChanged: { icon: "clipboard", className: "bg-st-received-bg text-st-received" },
  Cancelled: { icon: "x-circle", className: "bg-st-cancelled-bg text-st-cancelled" },
  PaymentRecorded: { icon: "wallet", className: "bg-success-50 text-success" },
  CostConfirmation: { icon: "scale", className: "bg-apricot text-ink" },
};

const ROW_CLASS = "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3.5 px-5 py-4 text-left";

type NotificationItemProps = {
  notification: Notification;
  todayKey: string;
  onRead: (notificationId: string) => void;
};

export function NotificationItem({ notification, todayKey, onRead }: NotificationItemProps) {
  const { notificationId, type, message, isRead, createdAt } = notification;
  const typeIcon = TYPE_ICONS[type];

  // Dùng span thay cho div/p vì nội dung có thể nằm trong <button>.
  const content = (
    <>
      <span aria-hidden="true" className={`grid size-10 place-items-center rounded-xl ${typeIcon.className}`}>
        <Icon name={typeIcon.icon} className="size-5" />
      </span>
      <span className="block min-w-0">
        <span className="block font-semibold">
          {NOTIFICATION_TYPE_LABELS[type]}
          {!isRead && (
            <>
              <span aria-hidden="true" className="ml-2 inline-block size-2 rounded-full bg-lagoon align-middle" />
              <span className="sr-only"> (chưa đọc)</span>
            </>
          )}
        </span>
        <span className="mt-1 block break-words text-muted">{message}</span>
      </span>
      <time dateTime={createdAt} className="whitespace-nowrap text-xs text-muted">
        {formatRelativeDay(createdAt, todayKey)}
      </time>
    </>
  );

  if (isRead) {
    return <div className={ROW_CLASS}>{content}</div>;
  }

  // Nền #FBFEFE: giá trị `.notif.unread` của UI demo, chưa có token.
  return (
    <button type="button" onClick={() => onRead(notificationId)} className={`${ROW_CLASS} cursor-pointer bg-[#FBFEFE]`}>
      {content}
    </button>
  );
}

