"use client";

// SW-13 Thông báo (nhân viên spa) – UI-Screens.md

import { useState } from "react";
import { NotificationItem } from "@/components/domain/notification-item";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Notification } from "@/lib/api/types";
import { useMarkNotificationRead, useNotificationList } from "@/lib/queries/notifications";
import { getStoreDateKey } from "@/lib/time";

const TITLE = "Thông báo";
const DESCRIPTION = "Phân công và thay đổi về lịch hẹn của bạn.";

// Gộp các trang đã tải; thông báo mới đến giữa hai lần tải có thể làm một dòng xuất hiện ở hai trang nên gộp theo notificationId.
function mergeNotificationPages(pages: { items: Notification[] }[]): Notification[] {
  const byId = new Map<string, Notification>();
  for (const page of pages) {
    for (const item of page.items) byId.set(item.notificationId, item);
  }
  return [...byId.values()];
}

export function NotificationsScreen() {
  const { showError } = useToast();
  const [now] = useState(() => new Date());
  const todayKey = getStoreDateKey(now);
  const query = useNotificationList();
  const { mutate: markRead } = useMarkNotificationRead();

  function handleRead(notificationId: string) {
    markRead(notificationId, { onError: (failure) => showError(failure) });
  }

  if (query.data === undefined) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <div className="max-w-[860px]">
          {query.isError ? (
            isForbiddenError(query.error) ? (
              <ForbiddenState />
            ) : (
              <div className="flex flex-col items-start gap-3">
                <ErrorAlert error={query.error} className="w-full" />
                <Button variant="secondary" onClick={() => void query.refetch()}>
                  Thử lại
                </Button>
              </div>
            )
          ) : (
            <div role="status" aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">Đang tải thông báo…</span>
              <Skeleton className="h-[84px] w-full rounded-2xl" />
              <Skeleton className="h-[84px] w-full rounded-2xl" />
              <Skeleton className="h-[84px] w-full rounded-2xl" />
            </div>
          )}
        </div>
      </>
    );
  }

  const notifications = mergeNotificationPages(query.data.pages);

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />

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
                {notifications.map((notification) => (
                  <li key={notification.notificationId}>
                    <NotificationItem notification={notification} todayKey={todayKey} onRead={handleRead} />
                  </li>
                ))}
              </ul>
            </Card>
            {query.isError && <ErrorAlert error={query.error} className="mt-5" />}
            {query.hasNextPage && (
              <div className="mt-5 flex justify-center">
                <Button
                  variant="secondary"
                  loading={query.isFetchingNextPage}
                  loadingText="Đang tải…"
                  onClick={() => void query.fetchNextPage()}
                >
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
