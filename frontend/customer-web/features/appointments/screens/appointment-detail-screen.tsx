"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { AppointmentErrorState } from "@/components/domain/appointment-error-state";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { APPOINTMENT_CANCELLED_MESSAGE } from "@/features/appointments/change-cancel";
import { AppointmentDetailHeader } from "@/features/appointments/components/appointment-detail-header";
import { AppointmentPaymentCard } from "@/features/appointments/components/appointment-payment-card";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import { ChangeCancelBlock } from "@/features/appointments/components/change-cancel-block";
import { OnlinePaymentDialog } from "@/features/appointments/components/online-payment-dialog";
import type { Payment } from "@/lib/api/types";
import { isChangeWindowClosedError } from "@/lib/appointments";
import { formatAppointmentCode } from "@/lib/format";
import { findSpaPayment, ONLINE_PAYMENT_GATEWAY } from "@/lib/payments";
import { useAppointment, useCancelAppointment } from "@/lib/queries/appointments";
import { useAppointmentPayments, usePayOnline } from "@/lib/queries/payments";
import { usePet } from "@/lib/queries/pets";
import { ROUTES, WINDOW_CLOSED_PARAM, WINDOW_CLOSED_VALUE } from "@/lib/routes";

function AppointmentDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Đang tải lịch hẹn…</span>
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <Skeleton className="size-[72px] rounded-[22px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-56 rounded-[10px]" />
              <Skeleton className="h-4 w-72 max-w-full rounded-[10px]" />
            </div>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <Skeleton className="h-5 w-48 rounded-[10px]" />
          <Skeleton className="mt-3 h-10 w-64 rounded-[10px]" />
        </CardBody>
      </Card>
    </div>
  );
}

export function AppointmentDetailScreen() {
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const id = typeof appointmentId === "string" ? appointmentId : "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();

  const { data: appointment, error, isFetching, refetch } = useAppointment(id);
  const { data: pet } = usePet(appointment?.petId ?? null);
  const cancel = useCancelAppointment();

  const isCompletedSpa = appointment?.type === "Spa" && appointment.status === "Completed";
  const payments = useAppointmentPayments(id, { enabled: isCompletedSpa, isPolling: false });
  const spaPayment = findSpaPayment(payments.data);
  const payOnline = usePayOnline(id);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isWindowClosedByCancel, setIsWindowClosedByCancel] = useState(false);
  const [dialogPayment, setDialogPayment] = useState<Payment | null>(null);
  const breadcrumbRef = useRef<HTMLAnchorElement>(null);

  // Quá hạn khi API vừa trả 409 CHANGE_WINDOW_CLOSED: ở thao tác hủy tại đây, hoặc ở màn đổi lịch (chuyển về kèm tham số).
  const isWindowClosed =
    isWindowClosedByCancel || searchParams.get(WINDOW_CLOSED_PARAM) === WINDOW_CLOSED_VALUE;

  const petName = pet?.name ?? appointment?.petName ?? "—";

  function openCancelDialog() {
    cancel.reset();
    setIsCancelDialogOpen(true);
  }

  function closeCancelDialog() {
    if (cancel.isPending) return;
    cancel.reset();
    setIsCancelDialogOpen(false);
  }

  function confirmCancel() {
    if (cancel.isPending) return;
    cancel.mutate(id, {
      onSuccess: () => {
        setIsCancelDialogOpen(false);
        showSuccess(APPOINTMENT_CANCELLED_MESSAGE);
      },
      onError: (failure) => {
        // Quá hạn: đóng hộp thoại, khóa hai nút kèm lý do ngay trên trang. Lỗi khác hiện ngay trong hộp thoại.
        if (isChangeWindowClosedError(failure)) {
          setIsCancelDialogOpen(false);
          setIsWindowClosedByCancel(true);
        }
      },
    });
  }

  function openPaymentDialog() {
    if (spaPayment === undefined) return;
    payOnline.reset();
    setDialogPayment(spaPayment);
  }

  function closePaymentDialog() {
    if (payOnline.isPending) return;
    payOnline.reset();
    setDialogPayment(null);
  }

  function confirmPayOnline() {
    if (payOnline.isPending || dialogPayment === null) return;
    payOnline.mutate(
      { paymentId: dialogPayment.paymentId, request: { gateway: ONLINE_PAYMENT_GATEWAY } },
      {
        onSuccess: ({ paymentUrl }) => {
          setDialogPayment(null);
          // Chờ nối API thật: paymentUrl là địa chỉ cổng thanh toán, đổi thành window.location.assign(paymentUrl) (UI-Screens CW-09·D3).
          // Hiện là đường dẫn trong web nên dùng router.push để giữ dữ liệu giả trong bộ nhớ.
          router.push(paymentUrl);
        },
      },
    );
  }

  let content: ReactNode;
  if (error !== null) {
    content = <AppointmentErrorState error={error} isRetrying={isFetching} onRetry={() => void refetch()} />;
  } else if (appointment === undefined) {
    content = <AppointmentDetailSkeleton />;
  } else {
    content = (
      <div className="flex flex-col gap-4">
        <AppointmentDetailHeader appointment={appointment} petName={petName} species={pet?.species ?? null} />
        {isCompletedSpa && (
          <AppointmentPaymentCard
            payment={spaPayment}
            isLoading={payments.isPending}
            error={payments.error}
            isRetrying={payments.isFetching}
            onRetry={() => void payments.refetch()}
            onPayOnline={openPaymentDialog}
          />
        )}
        <ChangeCancelBlock
          appointment={appointment}
          petName={petName}
          isWindowClosed={isWindowClosed}
          onCancel={openCancelDialog}
        />
      </div>
    );
  }

  return (
    <>
      <nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-1.5 text-[13px] text-muted">
        <Link ref={breadcrumbRef} href={ROUTES.appointments} className="hover:text-lagoon">
          Lịch hẹn của tôi
        </Link>
        <Icon name="chev-r" className="size-3.5" />
        <span aria-current="page">{id === "" ? "Chi tiết" : formatAppointmentCode(id)}</span>
      </nav>
      {appointment === undefined || error !== null ? (
        <PageHeader title="Chi tiết lịch hẹn" description="Xem thông tin, đổi hoặc hủy lịch hẹn của bạn." />
      ) : null}
      {content}
      {isCancelDialogOpen && (
        <CancelAppointmentDialog
          isCancelling={cancel.isPending}
          error={cancel.error}
          onConfirm={confirmCancel}
          onClose={closeCancelDialog}
          fallbackFocusRef={breadcrumbRef}
        />
      )}
      {dialogPayment !== null && appointment !== undefined && (
        <OnlinePaymentDialog
          appointmentLabel={`Lịch spa ${formatAppointmentCode(appointment.appointmentId)} của ${petName}`}
          amount={dialogPayment.amount}
          isPaying={payOnline.isPending}
          error={payOnline.error}
          onConfirm={confirmPayOnline}
          onClose={closePaymentDialog}
          fallbackFocusRef={breadcrumbRef}
        />
      )}
    </>
  );
}
