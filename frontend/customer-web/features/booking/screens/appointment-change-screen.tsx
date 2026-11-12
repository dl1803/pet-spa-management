"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrentAppointmentCard } from "@/features/booking/components/current-appointment-card";
import { HotelChangeForm } from "@/features/booking/components/hotel-change-form";
import { SpaChangeForm } from "@/features/booking/components/spa-change-form";
import { isForbiddenError, isNotFoundError } from "@/lib/api/errors";
import { CHANGE_WINDOW_CLOSED_MESSAGE, canSelfChangeOrCancel } from "@/lib/appointments";
import { formatAppointmentCode } from "@/lib/format";
import { useAppointment } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";

const DESCRIPTION = "Chọn thông tin mới cho lịch hẹn. Lịch đổi xong quay về Chờ xác nhận để cửa hàng duyệt lại.";

function AppointmentChangeSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Đang tải lịch hẹn…</span>
      <Skeleton className="h-[72px] rounded-xl" />
      <Card>
        <CardBody>
          <Skeleton className="h-5 w-40 rounded-[10px]" />
          <Skeleton className="mt-3 h-[84px] rounded-[10px]" />
        </CardBody>
      </Card>
    </div>
  );
}

export function AppointmentChangeScreen() {
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const id = typeof appointmentId === "string" ? appointmentId : "";

  const { data: appointment, error, isFetching, refetch } = useAppointment(id);
  const { data: pet } = usePet(appointment?.petId ?? null);

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
    content = <AppointmentChangeSkeleton />;
  } else if (!canSelfChangeOrCancel(appointment.status)) {
    content = (
      <div className="flex flex-col gap-4">
        <Alert tone="info" icon="lock">
          {CHANGE_WINDOW_CLOSED_MESSAGE}
        </Alert>
        <div>
          <ButtonLink href={ROUTES.appointmentDetail(id)} variant="secondary">
            Về chi tiết lịch hẹn
          </ButtonLink>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        <CurrentAppointmentCard
          appointment={appointment}
          petName={pet?.name ?? appointment.petName ?? "—"}
          species={pet?.species ?? null}
        />
        {appointment.type === "Hotel" ? (
          <HotelChangeForm appointment={appointment} />
        ) : (
          <SpaChangeForm appointment={appointment} />
        )}
      </>
    );
  }

  return (
    <>
      <nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-1.5 text-[13px] text-muted">
        <Link href={ROUTES.appointments} className="hover:text-lagoon">
          Lịch hẹn của tôi
        </Link>
        <Icon name="chev-r" className="size-3.5" />
        <Link href={ROUTES.appointmentDetail(id)} className="hover:text-lagoon">
          {id === "" ? "Chi tiết" : formatAppointmentCode(id)}
        </Link>
        <Icon name="chev-r" className="size-3.5" />
        <span aria-current="page">Đổi lịch</span>
      </nav>
      <PageHeader title="Đổi lịch hẹn" description={DESCRIPTION} />
      {content}
    </>
  );
}

