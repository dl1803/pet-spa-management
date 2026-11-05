import { useRef } from "react";
import { Icon, type IconName } from "@/components/icons";
import type { Notification } from "@/lib/api/types";
import { formatAppointmentCode, formatRelativeDay } from "@/lib/format";

// Ô biểu tượng theo `type` (UI-Screens mục 2.4), màu lấy từ token trạng thái lịch hẹn.
type NotificationView = { icon: IconName; iconClassName: string; title: string };

// Dòng đậm của thông báo nhân viên spa (UI-Screens SW-13): “Bạn được phân công lịch <mã>” / “Lịch <mã> đã hủy”.
// API chỉ trả `appointmentId`, mã hiển thị dựng từ đó (UI-Screens 2.6, G-01).
function getNotificationView({ type, appointmentId }: Notification): NotificationView {
  const code = appointmentId ? formatAppointmentCode(appointmentId) : null;
  switch (type) {
    case "ConfirmedAssigned":
      return {
        icon: "user-plus",
        iconClassName: "bg-st-confirmed-bg text-st-confirmed",
        title: code ? `Bạn được phân công lịch ${code}` : "Bạn được phân công lịch hẹn",
      };
    case "Cancelled":
      return {
        icon: "x-circle",
        iconClassName: "bg-st-cancelled-bg text-st-cancelled",
        title: code ? `Lịch ${code} đã hủy` : "Lịch hẹn đã hủy",
      };
    default:
      // Nhân viên spa chỉ nhận hai loại trên (FR-NOT-02, FR-NOT-04); giữ dự phòng để không mất nội dung nếu API trả loại khác.
      return { icon: "bell", iconClassName: "bg-line-soft text-muted", title: "Thông báo" };
  }
}

const ROW_CLASS = "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3.5 px-5 py-4 text-left";

type NotificationItemProps = {
  notification: Notification;
  todayKey: string;
  onRead: (notificationId: string) => void;
};

export function NotificationItem({ notification, todayKey, onRead }: NotificationItemProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { notificationId, message, isRead, createdAt } = notification;
  const view = getNotificationView(notification);

  // Dùng span thay cho div/p vì nội dung có thể nằm trong <button>.
  const content = (
    <>
      <span aria-hidden="true" className={`grid size-10 place-items-center rounded-xl ${view.iconClassName}`}>
        <Icon name={view.icon} className="size-5" />
      </span>
      <span className="block min-w-0">
        <span className="block font-semibold">
          {view.title}
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

  // Nền #FBFEFE: giá trị `.notif.unread` của UI demo, chưa có token. Vùng chạm cao hơn 44px nhờ đệm py-4.
  return (
    <div ref={rowRef} tabIndex={-1}>
      {isRead ? (
        <div className={ROW_CLASS}>{content}</div>
      ) : (
        <button
          type="button"
          onClick={() => {
            rowRef.current?.focus();
            onRead(notificationId);
          }}
          className={`${ROW_CLASS} cursor-pointer bg-[#FBFEFE]`}
        >
          {content}
        </button>
      )}
    </div>
  );
}
