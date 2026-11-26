import { apiClient } from "@/lib/api/client";
import type { NotificationPage } from "@/lib/api/types";

export type ListNotificationsParams = {
  page?: number;
  pageSize?: number;
};

// GET /notifications (listNotifications): chỉ thông báo gửi cho chính người gọi, mới nhất trước; `unread` là tổng số chưa đọc.
// Mặc định page = 1, pageSize = 20 (tối đa 100). Nhân viên spa nhận thông báo ConfirmedAssigned và Cancelled (FR-NOT-02, FR-NOT-04).
export async function listNotifications(params: ListNotificationsParams = {}) {
  const { data } = await apiClient.get<NotificationPage>("/notifications", { params });
  return data;
}
