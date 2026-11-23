"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GATEWAY_TXN_REF_PARAM, readPaymentAppointment } from "@/lib/payments";
import { PAYMENT_RETURN_PARAM, PAYMENT_RETURN_VALUE, ROUTES, withQuery } from "@/lib/routes";

// Địa chỉ cổng thanh toán đưa khách về (Payment__Vnpay__ReturnUrl). Không kết luận kết quả từ địa chỉ này:
// chỉ tra lịch hẹn đã ghi nhớ theo mã giao dịch rồi chuyển về chi tiết lịch hẹn, nơi kết quả do server quyết định.
// Không tra được thì về danh sách lịch hẹn.
export function PaymentReturnScreen() {
  const router = useRouter();
  const txnRef = useSearchParams().get(GATEWAY_TXN_REF_PARAM);

  useEffect(() => {
    const appointmentId = txnRef === null ? null : readPaymentAppointment(txnRef);
    router.replace(
      !appointmentId
        ? ROUTES.appointments
        : withQuery(ROUTES.appointmentDetail(appointmentId), { [PAYMENT_RETURN_PARAM]: PAYMENT_RETURN_VALUE }),
    );
  }, [router, txnRef]);

  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Đang chuyển về lịch hẹn…</span>
      <Skeleton className="h-8 w-60 rounded-[10px]" />
      <Skeleton className="h-40 rounded-[10px]" />
    </div>
  );
}
