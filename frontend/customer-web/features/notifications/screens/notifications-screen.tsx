"use client";

// CW-12 Thông báo – UI-Screens.md

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { NotificationItem } from "@/components/domain/notification-item";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import {
  NOTIFICATION_TABS,
  NOTIFICATIONS_PAGE_SIZE,
  countUnread,
  filterNotifications,
  parseNotificationTab,
  type NotificationTab,
} from "@/features/notifications/list";
import type { Notification } from "@/lib/api/types";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import { ROUTES, withQuery } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

const EMPTY_STATES: Record<NotificationTab, { title: string; description: string }> = {
  all: { title: "Chưa có thông báo nào", description: "Cập nhật về lịch hẹn của bạn sẽ hiện ở đây." },
  unread: { title: "Không có thông báo chưa đọc", description: "Bạn đã xem hết các thông báo." },
};

type NotificationListProps = {
  items: Notification[];
  tab: NotificationTab;
  todayKey: string;
  onRead: (notificationId: string) => void;
};

function NotificationList({ items, tab, todayKey, onRead }: NotificationListProps) {
  const [visibleCount, setVisibleCount] = useState(NOTIFICATIONS_PAGE_SIZE);
  const emptyState = EMPTY_STATES[tab];

  return (
    <div className="max-w-[860px]">
      {items.length === 0 ? (
        <Card>
          <EmptyState icon="bell" title={emptyState.title} description={emptyState.description} />
        </Card>
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-line-soft">
              {items.slice(0, visibleCount).map((notification) => (
                <li key={notification.notificationId}>
                  <NotificationItem notification={notification} todayKey={todayKey} onRead={onRead} />
                </li>
              ))}
            </ul>
          </Card>
          {items.length > visibleCount && (
            <div className="mt-5 flex justify-center">
              <Button variant="secondary" onClick={() => setVisibleCount((count) => count + NOTIFICATIONS_PAGE_SIZE)}>
                Xem thêm
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function NotificationsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [now] = useState(() => new Date());
  const todayKey = getStoreDateKey(now);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const tab = parseNotificationTab(searchParams.get("tab"));
  const tabItems = NOTIFICATION_TABS.map((item) => ({
    ...item,
    count: item.value === "unread" ? countUnread(notifications) : undefined,
  }));

  // Dữ liệu mô phỏng: chỉ đổi trạng thái đọc trên màn, chưa gọi API.
  function handleRead(notificationId: string) {
    setNotifications((items) =>
      items.map((item) => (item.notificationId === notificationId ? { ...item, isRead: true } : item)),
    );
  }

  return (
    <>
      <PageHeader title="Thông báo" description="Cập nhật về lịch hẹn của bạn." />

      <Tabs
        label="Nhóm thông báo"
        items={tabItems}
        value={tab}
        onChange={(value) => router.replace(withQuery(ROUTES.notifications, { tab: value }), { scroll: false })}
      />

      <div role="tabpanel">
        <NotificationList
          key={tab}
          items={filterNotifications(notifications, tab)}
          tab={tab}
          todayKey={todayKey}
          onRead={handleRead}
        />
      </div>
    </>
  );
}

