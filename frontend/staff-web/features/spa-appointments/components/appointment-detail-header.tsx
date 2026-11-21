import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentDetail, Pet } from "@/lib/api/types";
import { formatAppointmentCode, formatLongDate, formatTimeRange } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { EXECUTION_LOCKED_REASON, getPrimaryAction } from "@/features/spa-appointments/detail";

export function AppointmentDetailHeader({
  appointment,
  pet,
  petFailed,
}: {
  appointment: AppointmentDetail;
  pet: Pet | undefined;
  petFailed: boolean;
}) {
  const code = formatAppointmentCode(appointment.appointmentId);
  const primaryAction = getPrimaryAction(appointment.status);

  const details: string[] = [`Mã ${code}.`];
  if (appointment.slotStart && appointment.slotEnd) {
    details.push(`${formatLongDate(appointment.slotStart)}, ${formatTimeRange(appointment.slotStart, appointment.slotEnd)}.`);
  }

  return (
    <header className="mb-4">
      <nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-1.5 text-[13px] text-muted">
        <Link href={ROUTES.appointments} className="hover:text-lagoon">
          Lịch hẹn
        </Link>
        <Icon name="chev-r" className="size-3.5" />
        <span aria-current="page">{code}</span>
      </nav>
      <div className="flex items-center gap-4 max-[640px]:flex-wrap">
        {pet ? (
          <PetAvatar species={pet.species} size="xl" />
        ) : !petFailed ? (
          <Skeleton className="size-24 rounded-[28px]" />
        ) : (
          <span aria-hidden="true" className="size-24 shrink-0 rounded-[28px] bg-line-soft" />
        )}
        <div className="min-w-0 grow">
          <div className="flex flex-wrap items-center gap-2">
            <h1>{`Lịch spa của ${appointment.petName ?? "thú cưng"}`}</h1>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-1 text-muted">{details.join(" ")}</p>
        </div>
        {primaryAction === "open" ? (
          <div className="shrink-0 max-[640px]:w-full">
            <ButtonLink href={ROUTES.appointmentExecution(appointment.appointmentId)} size="lg">
              Mở màn hình thực hiện
            </ButtonLink>
          </div>
        ) : primaryAction === "locked" ? (
          <div className="shrink-0 max-[640px]:w-full">
            <Button size="lg" disabled aria-describedby="execution-locked-reason">
              Mở màn hình thực hiện
            </Button>
            <p id="execution-locked-reason" className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
              <Icon name="lock" className="size-3.5" />
              {EXECUTION_LOCKED_REASON}
            </p>
          </div>
        ) : null}
      </div>
    </header>
  );
}
