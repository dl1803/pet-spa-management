import { Alert } from "@/components/feedback/alert";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { CHANGE_CANCEL_NOTE, getChangeCancelState } from "@/features/appointments/change-cancel";
import type { AppointmentDetail } from "@/lib/api/types";
import { CHANGE_WINDOW_CLOSED_MESSAGE } from "@/lib/appointments";
import { formatDayAndTime, lowerFirst } from "@/lib/format";
import { CANCEL_REASON_LABELS } from "@/lib/labels";
import { ROUTES, withQuery } from "@/lib/routes";

const LOCK_REASON_ID = "change-cancel-lock-reason";

type ChangeCancelBlockProps = {
  appointment: AppointmentDetail;
  petName: string;
  // true khi API vừa trả 409 CHANGE_WINDOW_CLOSED (qua thao tác hủy hoặc qua màn đổi lịch).
  isWindowClosed: boolean;
  onCancel: () => void;
};

export function ChangeCancelBlock({ appointment, petName, isWindowClosed, onCancel }: ChangeCancelBlockProps) {
  if (appointment.status === "Cancelled") {
    return <CancelledNotice appointment={appointment} petName={petName} />;
  }

  const state = getChangeCancelState(appointment.status, isWindowClosed);
  if (state === "hidden") return null;

  const isLocked = state === "locked";

  return (
    <Card>
      <CardHeader title="Đổi hoặc hủy lịch hẹn" />
      <CardBody>
        {isLocked ? (
          <p
            id={LOCK_REASON_ID}
            role={isWindowClosed ? "alert" : undefined}
            className="flex items-start gap-1.5 text-muted"
          >
            <Icon name="lock" className="mt-0.5 size-4 shrink-0" />
            {CHANGE_WINDOW_CLOSED_MESSAGE}
          </p>
        ) : (
          <p className="text-muted">{CHANGE_CANCEL_NOTE}</p>
        )}
      </CardBody>
      <CardFooter>
        {isLocked ? (
          <>
            <Button variant="secondary" disabled aria-describedby={LOCK_REASON_ID}>
              Đổi lịch
            </Button>
            <Button variant="danger-solid" disabled aria-describedby={LOCK_REASON_ID}>
              Hủy lịch
            </Button>
          </>
        ) : (
          <>
            <ButtonLink href={ROUTES.appointmentChange(appointment.appointmentId)} variant="secondary">
              <Icon name="calendar" className="size-4" />
              Đổi lịch
            </ButtonLink>
            <Button variant="danger-solid" onClick={onCancel}>
              <Icon name="x-circle" className="size-4" />
              Hủy lịch
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

function CancelledNotice({ appointment, petName }: { appointment: AppointmentDetail; petName: string }) {
  const { cancelledAt, cancelReason } = appointment;
  const when = cancelledAt ? ` lúc ${formatDayAndTime(cancelledAt)}` : "";
  const reason = cancelReason ? ` Lý do: ${lowerFirst(CANCEL_REASON_LABELS[cancelReason])}.` : "";
  const rebookPath = appointment.type === "Hotel" ? ROUTES.hotelBooking : ROUTES.spaBooking;

  return (
    <Alert tone="neutral" icon="x-circle">
      <p>{`Lịch hẹn đã hủy${when}.${reason}`}</p>
      <div className="mt-3">
        <ButtonLink href={withQuery(rebookPath, { petId: appointment.petId })} variant="secondary">
          Đặt lại lịch cho {petName}
        </ButtonLink>
      </div>
    </Alert>
  );
}

