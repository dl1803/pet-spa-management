"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ActualReturnFields, CheckOutHeader, StayInfoTiles } from "@/features/reception-check-out/components/check-out-details";
import { CheckOutConfirmCard } from "@/features/reception-check-out/components/check-out-confirm";
import { CheckOutPaymentsCard } from "@/features/reception-check-out/components/check-out-payments";
import { ReturnList } from "@/features/reception-check-out/components/return-list";
import {
  canCheckOut,
  CHECK_OUT_LIST_QUERY_KEY,
  CHECK_OUT_QUERY_KEY,
  describeLateness,
  getCheckOutGate,
  getMinutesLate,
  isConflictError,
  isNotFoundError,
  NOT_CHECK_OUT_STEP_MESSAGE,
  selectTodayReturns,
  type CheckOutData,
} from "@/features/reception-check-out/check-out";
import { mockCheckOut, mockGetCheckOutData, mockListInStayAppointments } from "@/features/reception-check-out/mock-api";
import { useMinuteClock } from "@/features/reception-check-out/use-minute-clock";
import { isForbiddenError } from "@/lib/api/errors";
import { ROUTES } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

const TITLE = "Trả thú cưng lưu trú";
const DESCRIPTION = "Ghi nhận giờ đón thực tế, thu phí trả muộn nếu có, rồi bàn giao bé.";

export function CheckOutScreen() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      {appointmentId ? <CheckOutLoader key={appointmentId} appointmentId={appointmentId} /> : <ReturnPicker />}
    </>
  );
}

function CheckOutSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1024px]:grid-cols-1">
      <span className="sr-only">Đang tải lịch hẹn…</span>
      <Skeleton className="h-[360px] rounded-2xl" />
      <Skeleton className="h-[260px] rounded-2xl" />
    </div>
  );
}

function ReturnPicker() {
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const query = useQuery({ queryKey: CHECK_OUT_LIST_QUERY_KEY, queryFn: mockListInStayAppointments });

  if (query.data === undefined) {
    if (!query.isError) return <CheckOutSkeleton />;
    if (isForbiddenError(query.error)) return <ForbiddenState />;
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={query.error} className="w-full" />
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }
  return (
    <div className="max-w-[860px]">
      <ReturnList items={selectTodayReturns(query.data, todayKey)} />
    </div>
  );
}

function CheckOutLoader({ appointmentId }: { appointmentId: string }) {
  const query = useQuery({
    queryKey: [...CHECK_OUT_QUERY_KEY, appointmentId],
    queryFn: () => mockGetCheckOutData(appointmentId),
  });

  if (query.data === undefined) {
    if (!query.isError) return <CheckOutSkeleton />;
    if (isForbiddenError(query.error)) return <ForbiddenState />;
    if (isNotFoundError(query.error)) {
      return (
        <Card>
          <EmptyState
            icon="handover"
            title="Không tìm thấy lịch hẹn"
            description="Lịch hẹn có thể đã bị thay đổi hoặc không còn tồn tại."
            action={
              <ButtonLink variant="secondary" href={ROUTES.checkOut}>
                Chọn lịch khác
              </ButtonLink>
            }
          />
        </Card>
      );
    }
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={query.error} className="w-full" />
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }
  return <CheckOutWorkspace data={query.data} />;
}

function CheckOutWorkspace({ data }: { data: CheckOutData }) {
  const { appointment, pet, cage, payments } = data;
  const appointmentId = appointment.appointmentId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const nowMs = useMinuteClock();

  const mutation = useMutation({
    mutationFn: () => mockCheckOut(appointmentId),
    onSuccess: () => {
      showSuccess(cage !== null ? `Đã trả ${pet.name} cho khách. Chuồng ${cage.code} đã trống.` : `Đã trả ${pet.name} cho khách`);
      router.push(ROUTES.cages);
    },
    // Tải lại các khoản thanh toán: lần xác nhận bị từ chối vì phí trả muộn chưa thu là lúc khoản phí này xuất hiện.
    onError: (error) => {
      if (isConflictError(error)) void queryClient.invalidateQueries({ queryKey: [...CHECK_OUT_QUERY_KEY, appointmentId] });
    },
  });

  if (!canCheckOut(appointment)) {
    return (
      <div className="max-w-[860px]">
        <Card>
          <CheckOutHeader data={data} />
          <CardBody>
            <Alert tone="neutral" icon="note">
              {NOT_CHECK_OUT_STEP_MESSAGE}
            </Alert>
          </CardBody>
          <CardFooter>
            <ButtonLink variant="ghost" href={ROUTES.checkOut}>
              Quay lại
            </ButtonLink>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const notice = describeLateness(getMinutesLate(appointment.plannedCheckOut ?? "", nowMs));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1024px]:grid-cols-1">
      <Card>
        <CheckOutHeader data={data} />
        <CardBody>
          <div className="flex flex-col gap-4">
            <StayInfoTiles appointment={appointment} cage={cage} />
            <ActualReturnFields nowMs={nowMs} />
            <Alert tone={notice.tone} icon={notice.icon} title={notice.title}>
              {notice.body}
            </Alert>
          </div>
        </CardBody>
      </Card>
      <aside className="flex flex-col gap-4">
        <CheckOutPaymentsCard payments={payments} appointmentId={appointmentId} />
        <CheckOutConfirmCard
          gate={getCheckOutGate(payments)}
          cageCode={cage?.code ?? null}
          isSubmitting={mutation.isPending}
          error={mutation.error}
          onConfirm={() => mutation.mutate()}
        />
      </aside>
    </div>
  );
}
