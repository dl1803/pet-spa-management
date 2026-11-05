"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { NotificationItem } from "@/components/domain/notification-item";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import {
  NOTIFICATION_TABS,
  NOTIFICATIONS_PAGE_SIZE,
  filterNotifications,
  parseNotificationTab,
  type NotificationTab,
} from "@/features/notifications/list";
import { isForbiddenError } from "@/lib/api/errors";
import type { Notification } from "@/lib/api/types";
import { useMarkNotificationRead, useNotificationList, useUnreadNotificationCount } from "@/lib/queries/notifications";
import { ROUTES, withQuery } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

const EMPTY_STATES: Record<NotificationTab, { title: string; description: string }> = {
  all: { title: "Chưa có thông báo nào", description: "Cập nhật về lịch hẹn của bạn sẽ hiện ở đây." },
  unread: { title: "Không có thông báo chưa đọc", description: "Bạn đã xem hết các thông báo." },
};

const SKELETON_ROWS = [0, 1, 2];

function NotificationsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="max-w-[860px]">
      <span className="sr-only">Đang tải thông báo…</span>
      <Card>
        <ul className="divide-y divide-line-soft">
          {SKELETON_ROWS.map((row) => (
            <li key={row} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3.5 px-5 py-4">
              <Skeleton className="size-10 rounded-xl" />
              <div>
                <Skeleton className="h-4 w-48 max-w-full rounded-[10px]" />
                <Skeleton className="mt-2 h-4 w-full rounded-[10px]" />
              </div>
              <Skeleton className="h-3 w-12 rounded-[10px]" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

type NotificationListProps = {
  items: Notification[];
  tab: NotificationTab;
  todayKey: string;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onRead: (notificationId: string) => void;
  onLoadMore: () => void;
};

function NotificationList({
  items,
  tab,
  todayKey,
  hasMore,
  isFetchingNextPage,
  onRead,
  onLoadMore,
}: NotificationListProps) {
  const emptyState = EMPTY_STATES[tab];

  if (items.length === 0 && !hasMore) {
    return (
      <div className="max-w-[860px]">
        <Card>
          <EmptyState icon="bell" title={emptyState.title} description={emptyState.description} />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[860px]">
      {items.length > 0 && (
        <Card>
          <ul className="divide-y divide-line-soft">
            {items.map((notification) => (
              <li key={notification.notificationId}>
                <NotificationItem notification={notification} todayKey={todayKey} onRead={onRead} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {hasMore && (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" disabled={isFetchingNextPage} onClick={onLoadMore}>
            {isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function NotificationsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError } = useToast();
  const [now] = useState(() => new Date());
  const todayKey = getStoreDateKey(now);
  const { data, error, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useNotificationList(NOTIFICATIONS_PAGE_SIZE);
  const { data: bellUnread } = useUnreadNotificationCount();
  const { mutate: markRead } = useMarkNotificationRead();

  const tab = parseNotificationTab(searchParams.get("tab"));
  const unread = data?.pages[0]?.unread ?? bellUnread;
  const tabItems = NOTIFICATION_TABS.map((item) => ({
    ...item,
    count: item.value === "unread" ? unread : undefined,
  }));

  function handleRead(notificationId: string) {
    markRead(notificationId, { onError: (failure) => showError(failure) });
  }

  const allItems = data ? data.pages.flatMap((page) => page.items) : [];
  const loadedUnreadCount = allItems.filter((item) => !item.isRead).length;
  const hasMore =
    tab === "unread"
      ? unread !== undefined
        ? loadedUnreadCount < unread && hasNextPage
        : hasNextPage
      : hasNextPage;

  let body: ReactNode;
  if (data === undefined) {
    body =
      error === null ? (
        <NotificationsSkeleton />
      ) : isForbiddenError(error) ? (
        <ForbiddenState />
      ) : (
        <div>
          <ErrorAlert error={error} />
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              Thử lại
            </Button>
          </div>
        </div>
      );
  } else {
    body = (
      <>
        {error !== null && <ErrorAlert error={error} className="mb-4" />}
        <NotificationList
          items={filterNotifications(allItems, tab)}
          tab={tab}
          todayKey={todayKey}
          hasMore={hasMore}
          isFetchingNextPage={isFetchingNextPage}
          onRead={handleRead}
          onLoadMore={() => void fetchNextPage()}
        />
      </>
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

      <div role="tabpanel">{body}</div>
    </>
  );
}
