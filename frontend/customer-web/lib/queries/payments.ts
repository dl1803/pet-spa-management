import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OnlinePaymentRequest } from "@/lib/api/types";
import { mockListAppointmentPayments, mockPayOnline } from "@/lib/mock-payments";
import { findSpaPayment, PAYMENT_RESULT_INTERVAL_MS, PAYMENT_RESULT_MAX_CHECKS } from "@/lib/payments";
import { appointmentKeys } from "@/lib/queries/appointments";

type AppointmentPaymentsOptions = {
  // Chỉ tải khi lịch hẹn là lịch spa đã Hoàn tất.
  enabled: boolean;
  // true khi vừa quay về từ cổng: hỏi lại định kỳ đến khi khoản Spa Đã thanh toán hoặc đủ số lần.
  isPolling: boolean;
};

// Chờ nối API thật: listAppointmentPayments (GET /appointments/{appointmentId}/payments).
export function useAppointmentPayments(appointmentId: string, { enabled, isPolling }: AppointmentPaymentsOptions) {
  const queryClient = useQueryClient();
  const queryKey = appointmentKeys.payments(appointmentId);

  const query = useQuery({
    queryKey,
    queryFn: () => mockListAppointmentPayments(appointmentId),
    enabled,
    refetchInterval: (q) => {
      if (!isPolling || findSpaPayment(q.state.data)?.status === "Paid") return false;
      return q.state.dataUpdateCount > PAYMENT_RESULT_MAX_CHECKS ? false : PAYMENT_RESULT_INTERVAL_MS;
    },
  });

  const checkCount = queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0;

  return {
    ...query,
    checkCount,
  };
}

// Số lần đã tải khoản thanh toán thành công; dùng để biết khi nào thôi chờ kết quả của cổng.
// Màn gọi cùng lúc useAppointmentPayments nên được tính lại mỗi lần truy vấn cập nhật.
export function usePaymentCheckCount(appointmentId: string) {
  const queryClient = useQueryClient();
  return queryClient.getQueryState(appointmentKeys.payments(appointmentId))?.dataUpdateCount ?? 0;
}

export type PayOnlineVariables = {
  // paymentId của khoản thanh toán, không phải appointmentId.
  paymentId: string;
  request: OnlinePaymentRequest;
};

// Chờ nối API thật: payOnline (POST /payments/{paymentId}/online).
// Thành công: đặt lại truy vấn để bộ đếm chờ kết quả tính lại cho lượt thanh toán mới.
// Lỗi (409 nghĩa là khoản đã đổi): tải lại khoản thanh toán.
export function usePayOnline(appointmentId: string) {
  const queryClient = useQueryClient();
  const queryKey = appointmentKeys.payments(appointmentId);

  return useMutation({
    mutationFn: ({ paymentId, request }: PayOnlineVariables) => mockPayOnline(paymentId, request),
    onSuccess: () => {
      void queryClient.resetQueries({ queryKey });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
