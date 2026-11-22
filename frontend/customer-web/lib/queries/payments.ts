import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAppointmentPayments, payOnline } from "@/lib/api/endpoints/payments";
import { ApiError } from "@/lib/api/errors";
import type { OnlinePaymentRequest } from "@/lib/api/types";
import { findSpaPayment, isHttpsUrl, PAYMENT_RESULT_INTERVAL_MS, PAYMENT_RESULT_MAX_CHECKS } from "@/lib/payments";
import { appointmentKeys } from "@/lib/queries/appointments";

type AppointmentPaymentsOptions = {
  // Chỉ tải khi lịch hẹn là lịch spa đã Hoàn tất.
  enabled: boolean;
  // true khi vừa quay về từ cổng: hỏi lại định kỳ đến khi khoản Spa Đã thanh toán hoặc đủ số lần.
  isPolling: boolean;
};

// GET /appointments/{appointmentId}/payments.
export function useAppointmentPayments(appointmentId: string, { enabled, isPolling }: AppointmentPaymentsOptions) {
  const queryClient = useQueryClient();
  const queryKey = appointmentKeys.payments(appointmentId);

  const query = useQuery({
    queryKey,
    queryFn: () => listAppointmentPayments(appointmentId),
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

// POST /payments/{paymentId}/online.
// Thành công: màn hình chuyển hẳn sang cổng thanh toán nên không cần tải lại khoản thanh toán.
// paymentUrl không phải địa chỉ https thì coi là lỗi, không chuyển trang.
// Lỗi (409 nghĩa là khoản đã đổi): tải lại khoản thanh toán.
export function usePayOnline(appointmentId: string) {
  const queryClient = useQueryClient();
  const queryKey = appointmentKeys.payments(appointmentId);

  return useMutation({
    mutationFn: async ({ paymentId, request }: PayOnlineVariables) => {
      const created = await payOnline(paymentId, request);
      if (!isHttpsUrl(created.paymentUrl)) throw new ApiError({ kind: "unknown" });
      return created;
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
