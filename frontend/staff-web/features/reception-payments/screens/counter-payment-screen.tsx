"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentsWorkspace } from "@/features/reception-payments/components/payments-workspace";
import { mockListCounterPayments } from "@/features/reception-payments/mock-api";
import { COUNTER_PAYMENTS_QUERY_KEY } from "@/features/reception-payments/payment";
import { isForbiddenError } from "@/lib/api/errors";
import { getStoreDateKey } from "@/lib/time";

function PaymentsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid grid-cols-[minmax(300px,400px)_minmax(0,1fr)] items-start gap-6 max-[900px]:grid-cols-1"
    >
      <span className="sr-only">Đang tải khoản cần thu…</span>
      <Card>
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-[84px] rounded-2xl" />
          <Skeleton className="h-[84px] rounded-2xl" />
        </div>
      </Card>
      <Card>
        <div className="flex flex-col gap-4 p-5">
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-11 rounded-[10px]" />
        </div>
      </Card>
    </div>
  );
}

export function CounterPaymentScreen() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const query = useQuery({ queryKey: COUNTER_PAYMENTS_QUERY_KEY, queryFn: mockListCounterPayments });

  return (
    <>
      <PageHeader
        title="Thanh toán tại quầy"
        description="Số tiền do hệ thống tính. Chỉ ghi nhận Đã thanh toán khi nhận đủ tiền."
      />
      {query.data !== undefined ? (
        <PaymentsWorkspace data={query.data} appointmentId={appointmentId} todayKey={todayKey} />
      ) : query.isError ? (
        isForbiddenError(query.error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={query.error} className="w-full" />
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Thử lại
            </Button>
          </div>
        )
      ) : (
        <PaymentsSkeleton />
      )}
    </>
  );
}
