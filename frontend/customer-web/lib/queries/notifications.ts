import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { NotificationPage } from "@/lib/api/types";
import { mockListNotifications, mockMarkNotificationRead } from "@/lib/mock-notifications";

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => ["notifications", "list"] as const,
  list: (pageSize: number) => ["notifications", "list", pageSize] as const,
  unread: () => ["notifications", "unread"] as const,
};

type NotificationListData = InfiniteData<NotificationPage, number>;

export function useNotificationList(pageSize: number) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(pageSize),
    queryFn: ({ pageParam }) => mockListNotifications({ page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => mockListNotifications({ page: 1, pageSize: 1 }),
    select: (page) => page.unread,
  });
}

function containsUnread(data: NotificationListData | undefined, notificationId: string) {
  return (
    data?.pages.some((page) => page.items.some((item) => item.notificationId === notificationId && !item.isRead)) ??
    false
  );
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mockMarkNotificationRead,
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const wasUnread = queryClient
        .getQueriesData<NotificationListData>({ queryKey: notificationKeys.lists() })
        .some(([, data]) => containsUnread(data, notificationId));
      if (!wasUnread) return;

      queryClient.setQueriesData<NotificationListData>({ queryKey: notificationKeys.lists() }, (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            unread: Math.max(0, page.unread - 1),
            items: page.items.map((item) => (item.notificationId === notificationId ? { ...item, isRead: true } : item)),
          })),
        },
      );
      queryClient.setQueryData<NotificationPage>(notificationKeys.unread(), (page) =>
        page && { ...page, unread: Math.max(0, page.unread - 1) },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

