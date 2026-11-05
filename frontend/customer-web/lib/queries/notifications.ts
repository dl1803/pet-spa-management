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

