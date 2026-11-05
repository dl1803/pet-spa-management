"use client";

// SW-13 Thông báo (nhân viên spa) – UI-Screens.md

import { useState } from "react";
import { NotificationItem } from "@/components/domain/notification-item";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MOCK_NOTIFICATIONS } from "@/features/notifications/mock-data";
import type { Notification } from "@/lib/api/types";
import { getStoreDateKey } from "@/lib/time";

// Cỡ trang của GET /notifications; “Xem thêm” hiện thêm từng đợt chừng này thông báo (như Web Khách hàng).
const NOTIFICATIONS_PAGE_SIZE = 20;

export function NotificationsScreen() {
  const [now] = useState(() => new Date());
  const todayKey = getStoreDateKey(now);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [visibleCount, setVisibleCount] = useState(NOTIFICATIONS_PAGE_SIZE);

  // Dữ liệu mô phỏng: chỉ đổi trạng thái đọc trên màn, chưa gọi API và chưa mở chi tiết lịch (SW-03 chưa có).
  function handleRead(notificationId: string) {
    setNotifications((items) =>
      items.map((item) => (item.notificationId === notificationId ? { ...item, isRead: true } : item)),
    );
  }

  return (
    <>
      <PageHeader title="Thông báo" description="Phân công và thay đổi về lịch hẹn của bạn." />

      <div className="max-w-[860px]">
        {notifications.length === 0 ? (
          <Card>
            <EmptyState
              icon="bell"
              title="Chưa có thông báo nào"
              description="Lịch mới được phân công và lịch bị hủy sẽ hiện ở đây."
            />
          </Card>
        ) : (
          <>
            <Card>
              <ul className="divide-y divide-line-soft">
                {notifications.slice(0, visibleCount).map((notification) => (
                  <li key={notification.notificationId}>
                    <NotificationItem notification={notification} todayKey={todayKey} onRead={handleRead} />
                  </li>
                ))}
              </ul>
            </Card>
            {notifications.length > visibleCount && (
              <div className="mt-5 flex justify-center">
                <Button variant="secondary" onClick={() => setVisibleCount((count) => count + NOTIFICATIONS_PAGE_SIZE)}>
                  Xem thêm
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
