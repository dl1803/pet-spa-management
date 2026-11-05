import type { Notification } from "@/lib/api/types";

export type NotificationTab = "all" | "unread";

export const NOTIFICATION_TABS: { value: NotificationTab; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "unread", label: "Chưa đọc" },
];

export const NOTIFICATIONS_PAGE_SIZE = 20;

export function parseNotificationTab(value: string | null): NotificationTab {
  return NOTIFICATION_TABS.find((tab) => tab.value === value)?.value ?? "all";
}

export function filterNotifications(items: Notification[], tab: NotificationTab): Notification[] {
  return tab === "unread" ? items.filter((item) => !item.isRead) : items;
}
