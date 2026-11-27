import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { listNotifications, markNotificationRead } from "@/lib/api/endpoints/notifications";
import type { NotificationPage } from "@/lib/api/types";

// Cỡ trang của GET /notifications; “Xem thêm” tải thêm từng trang chừng này thông báo.
export const NOTIFICATIONS_PAGE_SIZE = 20;
// UI-Screens 2.1 / FA 5.1: làm mới số thông báo chưa đọc 60 giây một lần khi tab đang hiển thị.
export const UNREAD_COUNT_REFETCH_MS = 60_000;

// Cùng hình dạng khóa với customer-web.
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => ["notifications", "list"] as const,
  list: (pageSize: number) => ["notifications", "list", pageSize] as const,
  unread: () => ["notifications", "unread"] as const,
};

type NotificationListData = InfiniteData<NotificationPage, number>;

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

export function useUnreadNotificationCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => listNotifications({ page: 1, pageSize: 1 }),
    select: (page) => page.unread,
    enabled: options?.enabled,
    refetchInterval: UNREAD_COUNT_REFETCH_MS,
    refetchIntervalInBackground: false,
  });
}

function containsUnread(data: NotificationListData | undefined, notificationId: string) {
  return (
    data?.pages.some((page) => page.items.some((item) => item.notificationId === notificationId && !item.isRead)) ??
    false
  );
}

// Cập nhật lạc quan trạng thái đã đọc và số chưa đọc trên chuông, hoàn tác nếu API lỗi và đồng bộ lại từ server.
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousLists = queryClient.getQueriesData<NotificationListData>({ queryKey: notificationKeys.lists() });
      const previousUnread = queryClient.getQueryData<NotificationPage>(notificationKeys.unread());
      const wasUnread = previousLists.some(([, data]) => containsUnread(data, notificationId));

      queryClient.setQueriesData<NotificationListData>({ queryKey: notificationKeys.lists() }, (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            unread: wasUnread ? Math.max(0, page.unread - 1) : page.unread,
            items: page.items.map((item) => (item.notificationId === notificationId ? { ...item, isRead: true } : item)),
          })),
        },
      );

      if (wasUnread) {
        queryClient.setQueryData<NotificationPage>(notificationKeys.unread(), (page) =>
          page && { ...page, unread: Math.max(0, page.unread - 1) },
        );
      }

      return { previousLists, previousUnread };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousLists) {
        for (const [queryKey, data] of context.previousLists) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      if (context?.previousUnread) {
        queryClient.setQueryData(notificationKeys.unread(), context.previousUnread);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
