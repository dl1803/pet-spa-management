import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Icon } from "@/components/icons";
import { Card, CardBody } from "@/components/ui/card";
import type { AppointmentDetail, Species } from "@/lib/api/types";
import { describeSchedule } from "@/lib/appointments";
import { formatAppointmentCode } from "@/lib/format";

type AppointmentDetailHeaderProps = {
  appointment: AppointmentDetail;
  petName: string;
  // null khi chưa tải được hồ sơ thú cưng; hiện biểu tượng chung.
  species: Species | null;
};

export function AppointmentDetailHeader({ appointment, petName, species }: AppointmentDetailHeaderProps) {
  const title = appointment.type === "Hotel" ? `Lịch lưu trú của ${petName}` : `Lịch spa của ${petName}`;
  const meta = [`Mã ${formatAppointmentCode(appointment.appointmentId)}`, describeSchedule(appointment)]
    .filter(Boolean)
    .join(". ");

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center gap-4">
          {species !== null ? (
            <PetAvatar species={species} size="lg" />
          ) : (
            <span className="grid size-[72px] shrink-0 place-items-center rounded-[22px] bg-line-soft text-muted">
              <Icon name="paw" className="size-8" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1>{title}</h1>
              <StatusBadge status={appointment.status} />
            </div>
            <p className="mt-1 text-muted">{meta}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

