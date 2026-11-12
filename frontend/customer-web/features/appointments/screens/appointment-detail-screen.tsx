"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { APPOINTMENT_CANCELLED_MESSAGE } from "@/features/appointments/change-cancel";
import { AppointmentDetailHeader } from "@/features/appointments/components/appointment-detail-header";
import { CancelAppointmentDialog } from "@/features/appointments/components/cancel-appointment-dialog";
import { ChangeCancelBlock } from "@/features/appointments/components/change-cancel-block";
import { isForbiddenError, isNotFoundError } from "@/lib/api/errors";
import { isChangeWindowClosedError } from "@/lib/appointments";
import { formatAppointmentCode } from "@/lib/format";
import { useAppointment, useCancelAppointment } from "@/lib/queries/appointments";
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
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();

  const { data: appointment, error, isFetching, refetch } = useAppointment(id);
  const { data: pet } = usePet(appointment?.petId ?? null);
  const cancel = useCancelAppointment();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isWindowClosedByCancel, setIsWindowClosedByCancel] = useState(false);
  const breadcrumbRef = useRef<HTMLAnchorElement>(null);

  // Quá hạn khi API vừa trả 409 CHANGE_WINDOW_CLOSED: ở thao tác hủy tại đây, hoặc ở màn đổi lịch (chuyển về kèm tham số).
  const isWindowClosed =
    isWindowClosedByCancel || searchParams.get(WINDOW_CLOSED_PARAM) === WINDOW_CLOSED_VALUE;

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

  let content: ReactNode;
  if (error !== null) {
    if (isForbiddenError(error)) {
      content = <ForbiddenState />;
    } else if (isNotFoundError(error)) {
      content = (
        <NotFoundState
          title="Không tìm thấy lịch hẹn"
          description="Không tìm thấy dữ liệu, có thể đã bị thay đổi."
          action={
            <ButtonLink href={ROUTES.appointments} variant="secondary">
              Về lịch hẹn của tôi
            </ButtonLink>
          }
        />
      );
    } else {
      content = (
        <div>
          <ErrorAlert error={error} />
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              Thử lại
            </Button>
          </div>
        </div>
      );
    }
  } else if (appointment === undefined) {
    content = <AppointmentDetailSkeleton />;
  } else {
    const petName = pet?.name ?? appointment.petName ?? "—";
    content = (
      <div className="flex flex-col gap-4">
        <AppointmentDetailHeader appointment={appointment} petName={petName} species={pet?.species ?? null} />
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
    </>
  );
}

