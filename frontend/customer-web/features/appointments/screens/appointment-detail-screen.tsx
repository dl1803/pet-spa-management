"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppointmentErrorState } from "@/components/domain/appointment-error-state";
import { Alert } from "@/components/feedback/alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { APPOINTMENT_CANCELLED_MESSAGE } from "@/features/appointments/change-cancel";
import {
  COST_CONFIRMATION_EXPIRED_MESSAGE,
  COST_REJECTED_MESSAGE,
  getCostAcceptedMessage,
  getCostDialogSubject,
} from "@/features/appointments/cost-confirmation";
import { AppointmentDetailHeader } from "@/features/appointments/components/appointment-detail-header";
import { AppointmentPaymentCard } from "@/features/appointments/components/appointment-payment-card";
import { AppointmentPhotosCard } from "@/features/appointments/components/appointment-photos-card";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import { ChangeCancelBlock } from "@/features/appointments/components/change-cancel-block";
import { CostConfirmationBanner } from "@/features/appointments/components/cost-confirmation-banner";
import { OnlinePaymentDialog } from "@/features/appointments/components/online-payment-dialog";
import { PaymentResultAlert } from "@/features/appointments/components/payment-result-alert";
import { RejectCostDialog } from "@/features/appointments/components/reject-cost-dialog";
import type { Payment } from "@/lib/api/types";
import { isChangeWindowClosedError, isCostConfirmationGoneError } from "@/lib/appointments";
import { formatAppointmentCode } from "@/lib/format";
import { findSpaPayment, getPaymentResultState, ONLINE_PAYMENT_GATEWAY, rememberPaymentAppointment } from "@/lib/payments";
import { getPhotoSectionMode } from "@/lib/photos";
import {
  useAppointment,
  useAppointmentPhotos,
  useCancelAppointment,
  useRespondCostConfirmation,
} from "@/lib/queries/appointments";
import { useAppointmentPayments, usePayOnline } from "@/lib/queries/payments";
import { usePet } from "@/lib/queries/pets";
import { PAYMENT_RETURN_PARAM, PAYMENT_RETURN_VALUE, ROUTES, WINDOW_CLOSED_PARAM, WINDOW_CLOSED_VALUE } from "@/lib/routes";

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
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();

  const { data: appointment, error, isFetching, refetch } = useAppointment(id);
  const { data: pet } = usePet(appointment?.petId ?? null);
  const cancel = useCancelAppointment();
  const respond = useRespondCostConfirmation();

  const isCompletedSpa = appointment?.type === "Spa" && appointment.status === "Completed";
  const isPaymentReturn = searchParams.get(PAYMENT_RETURN_PARAM) === PAYMENT_RETURN_VALUE;
  const payments = useAppointmentPayments(id, { enabled: isCompletedSpa, isPolling: isPaymentReturn });
  const checkCount = payments.checkCount;
  const spaPayment = findSpaPayment(payments.data);

  // Lỗi khi tải khoản thanh toán thì không kết luận; khối thanh toán tự hiện lỗi và nút Thử lại.
  const resultState =
    isCompletedSpa && isPaymentReturn && payments.error === null ? getPaymentResultState(spaPayment, checkCount) : null;
  const payOnline = usePayOnline(id);

  // Ảnh chỉ được tải khi lịch spa có thể đã có ảnh; lịch lưu trú và lịch spa đã hủy không hiện khối ảnh.
  const photoMode = appointment === undefined ? "hidden" : getPhotoSectionMode(appointment);
  const photos = useAppointmentPhotos(id, { enabled: photoMode === "live" });

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isWindowClosedByCancel, setIsWindowClosedByCancel] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isCostConfirmationGone, setIsCostConfirmationGone] = useState(false);
  const [dialogPayment, setDialogPayment] = useState<Payment | null>(null);
  const breadcrumbRef = useRef<HTMLAnchorElement>(null);

  // Khách bấm Back từ cổng: trình duyệt khôi phục trang từ bộ nhớ đệm với hộp thoại đang chờ chuyển trang,
  // nên đóng hộp thoại, đặt lại thao tác và tải lại khoản thanh toán để cập nhật trạng thái mới nhất.
  const { reset: resetPayOnline } = payOnline;
  const { refetch: refetchPayments } = payments;
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      resetPayOnline();
      setDialogPayment(null);
      void refetchPayments();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [refetchPayments, resetPayOnline]);

  // Quá hạn khi API vừa trả 409 CHANGE_WINDOW_CLOSED: ở thao tác hủy tại đây, hoặc ở màn đổi lịch (chuyển về kèm tham số).
  const isWindowClosed =
    isWindowClosedByCancel || searchParams.get(WINDOW_CLOSED_PARAM) === WINDOW_CLOSED_VALUE;

  const petName = pet?.name ?? appointment?.petName ?? "—";
  const pendingCost = appointment?.pendingCostConfirmation ?? null;

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

  function openRejectDialog() {
    respond.reset();
    setIsRejectDialogOpen(true);
  }

  function closeRejectDialog() {
    if (respond.isPending) return;
    respond.reset();
    setIsRejectDialogOpen(false);
  }

  function respondToCost(accept: boolean) {
    if (respond.isPending || appointment === undefined) return;
    if (pendingCost === null || pendingCost.status !== "Pending") {
      setIsRejectDialogOpen(false);
      setIsCostConfirmationGone(true);
      return;
    }
    const { newAmount } = pendingCost;
    setIsCostConfirmationGone(false);
    respond.mutate(
      { appointmentId: id, accept },
      {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          showSuccess(accept ? getCostAcceptedMessage(appointment.type, newAmount, petName) : COST_REJECTED_MESSAGE);
        },
        onError: (failure) => {
          // Yêu cầu hết hạn hoặc không còn: đóng hộp thoại, báo ở đầu trang (banner có thể biến mất sau khi tải lại).
          // Lỗi khác hiện ngay trong banner (đồng ý) hoặc trong hộp thoại (từ chối).
          if (isCostConfirmationGoneError(failure)) {
            setIsRejectDialogOpen(false);
            setIsCostConfirmationGone(true);
          }
        },
      },
    );
  }

  function openPaymentDialog() {
    if (spaPayment === undefined) return;
    payOnline.reset();
    setDialogPayment(spaPayment);
  }

  function closePaymentDialog() {
    if (payOnline.isPending || payOnline.isSuccess) return;
    payOnline.reset();
    setDialogPayment(null);
  }

  function confirmPayOnline() {
    if (payOnline.isPending || payOnline.isSuccess || dialogPayment === null) return;
    payOnline.mutate(
      { paymentId: dialogPayment.paymentId, request: { gateway: ONLINE_PAYMENT_GATEWAY } },
      {
        onSuccess: ({ paymentUrl, txnRef }) => {
          // Giữ hộp thoại ở trạng thái đang xử lý cho đến khi trình duyệt rời trang để khách không bấm lặp.
          rememberPaymentAppointment(txnRef, id);
          window.location.assign(paymentUrl);
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
        {resultState !== null && (
          <PaymentResultAlert state={resultState} payment={spaPayment} onRetry={openPaymentDialog} />
        )}
        {isCostConfirmationGone && <Alert tone="danger">{COST_CONFIRMATION_EXPIRED_MESSAGE}</Alert>}
        <AppointmentDetailHeader appointment={appointment} petName={petName} species={pet?.species ?? null} />
        {pendingCost !== null && pendingCost.status === "Pending" && (
          <CostConfirmationBanner
            confirmation={pendingCost}
            petName={petName}
            currentWeightKg={pet?.weightKg ?? null}
            currentSizeGroup={pet?.sizeGroup ?? appointment.sizeGroup}
            isResponding={respond.isPending}
            isAccepting={respond.isPending && respond.variables?.accept === true}
            error={isRejectDialogOpen || isCostConfirmationGone ? null : respond.error}
            onAccept={() => respondToCost(true)}
            onReject={openRejectDialog}
            onExpire={() => void refetch()}
          />
        )}
        {photoMode !== "hidden" && (
          <AppointmentPhotosCard
            isAwaiting={photoMode === "awaiting"}
            photos={photos.data}
            error={photos.error}
            isRetrying={photos.isFetching}
            onRetry={() => void photos.refetch()}
          />
        )}
        {isCompletedSpa && (
          <AppointmentPaymentCard
            payment={spaPayment}
            isLoading={payments.isPending}
            error={payments.error}
            isRetrying={payments.isFetching}
            isOnlineActionHidden={resultState !== null}
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
      {isRejectDialogOpen && appointment !== undefined && (
        <RejectCostDialog
          subject={getCostDialogSubject(appointment.type, formatAppointmentCode(appointment.appointmentId), petName)}
          isRejecting={respond.isPending}
          error={respond.error}
          onConfirm={() => respondToCost(false)}
          onClose={closeRejectDialog}
          fallbackFocusRef={breadcrumbRef}
        />
      )}
      {dialogPayment !== null && appointment !== undefined && (
        <OnlinePaymentDialog
          appointmentLabel={`Lịch spa ${formatAppointmentCode(appointment.appointmentId)} của ${petName}`}
          amount={dialogPayment.amount}
          isPaying={payOnline.isPending || payOnline.isSuccess}
          error={payOnline.error}
          onConfirm={confirmPayOnline}
          onClose={closePaymentDialog}
          fallbackFocusRef={breadcrumbRef}
        />
      )}
    </>
  );
}
