import { ApiError } from "@/lib/api/errors";
import type { Notification, NotificationPage } from "@/lib/api/types";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";

const MOCK_DELAY_MS = 400;

// Giữ trong bộ nhớ trình duyệt; tải lại trang thì về dữ liệu ban đầu. Sắp xếp theo thời gian giảm dần.
let notifications: Notification[] = [...MOCK_NOTIFICATIONS].sort(
  (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
);

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

type ListNotificationsParams = { page: number; pageSize: number };

export async function mockListNotifications({ page, pageSize }: ListNotificationsParams): Promise<NotificationPage> {
  await wait();

  const start = (page - 1) * pageSize;
  return {
    items: notifications.slice(start, start + pageSize).map((item) => ({ ...item })),
    page,
    pageSize,
    total: notifications.length,
    unread: notifications.filter((item) => !item.isRead).length,
  };
}

export async function mockMarkNotificationRead(notificationId: string): Promise<void> {
  await wait();

  if (!notifications.some((item) => item.notificationId === notificationId)) {
    throw new ApiError({
      kind: "http",
      status: 404,
      code: "NOT_FOUND",
      title: "Không tìm thấy dữ liệu",
      detail: "Không tìm thấy dữ liệu, có thể đã bị thay đổi.",
    });
  }

  notifications = notifications.map((item) =>
    item.notificationId === notificationId ? { ...item, isRead: true } : item,
  );
}

