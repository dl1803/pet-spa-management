import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPayments, payAtCounter, type ListPaymentsParams } from "@/lib/api/endpoints/payments";
import type { CounterPaymentRequest } from "@/lib/api/types";

export const paymentKeys = {
  all: ["payments"] as const,
  list: (params: ListPaymentsParams) => ["payments", "list", params] as const,
};

// MW-10 vùng 1: thẻ “Chưa thanh toán” và số trên chip lấy từ tối đa 100 khoản chưa thanh toán (UI-Screens).
export const UNPAID_SUMMARY_PAGE_SIZE = 100;

const UNPAID_SUMMARY_PARAMS: ListPaymentsParams = { status: "Unpaid", page: 1, pageSize: UNPAID_SUMMARY_PAGE_SIZE };

// MW-10 vùng 3: một trang danh sách theo bộ lọc trên URL. Giữ trang cũ trong lúc tải trang mới để bảng và phân trang không nhấp nháy.
export function usePayments(params: ListPaymentsParams) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => listPayments(params),
    placeholderData: keepPreviousData,
  });
}

export function useUnpaidPayments() {
  return useQuery({
    queryKey: paymentKeys.list(UNPAID_SUMMARY_PARAMS),
    queryFn: () => listPayments(UNPAID_SUMMARY_PARAMS),
  });
}

// Làm mới mọi danh sách thanh toán từ server trước khi mutation báo xong, kể cả khi lỗi (404/409 nghĩa là khoản đã đổi),
// để màn hình luôn hiển thị kết quả server (Frontend-Architecture 5.1).
function useRefreshPayments() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: paymentKeys.all, refetchType: "all" });
}

export function useRecordCounterPayment() {
  const refreshPayments = useRefreshPayments();
  return useMutation({
    mutationFn: (params: { paymentId: string; request: CounterPaymentRequest }) =>
      payAtCounter(params.paymentId, params.request),
    onSettled: refreshPayments,
  });
}
