import { useInfiniteQuery } from "@tanstack/react-query";
import { listNotifications } from "@/lib/api/endpoints/notifications";
import type { NotificationPage } from "@/lib/api/types";

// Cỡ trang của GET /notifications; “Xem thêm” tải thêm từng trang chừng này thông báo.
export const NOTIFICATIONS_PAGE_SIZE = 20;

// Cùng hình dạng khóa với customer-web.
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (pageSize: number) => ["notifications", "list", pageSize] as const,
};

// Trang kế tiếp khi còn thông báo chưa tải; không còn thì undefined.
export function getNextNotificationPage(lastPage: NotificationPage) {
  return lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined;
}

export function useNotificationList(pageSize: number = NOTIFICATIONS_PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(pageSize),
    queryFn: ({ pageParam }) => listNotifications({ page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: getNextNotificationPage,
  });
}
