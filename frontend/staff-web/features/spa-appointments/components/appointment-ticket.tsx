"use client";

import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, AppointmentDetail, Pet } from "@/lib/api/types";
import { formatShortDate, formatTime, formatWeekdayShort } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useAppointment } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { canOpenExecution } from "@/features/spa-appointments/list";
import { TicketChip } from "@/features/spa-appointments/components/ticket-chip";

export type TicketVariant = "today" | "upcoming";
export type DetailState = "loading" | "ready" | "error";

export type AppointmentTicketViewProps = {
  appointment: Appointment;
  variant: TicketVariant;
  pet: Pet | undefined;
  detail: AppointmentDetail | undefined;
  detailState: DetailState;
};

export function AppointmentTicketView({
  appointment,
  variant,
  pet,
  detail,
  detailState,
}: AppointmentTicketViewProps) {
  const petName = appointment.petName ?? "Thú cưng";
  const slotStart = appointment.slotStart;
  const slotEnd = appointment.slotEnd;

  const serviceNames = (detail?.services ?? [])
    .map((s) => s.name?.trim())
    .filter((n): n is string => Boolean(n));

  const showPendingCost = detail?.pendingCostConfirmation?.status === "Pending";
  const showWaitingReception = appointment.status === "Confirmed";
  const petNotes = pet?.notes?.trim();
  const hasChips = variant === "today" && (showPendingCost || showWaitingReception || Boolean(petNotes));

  return (
    <li className="flex overflow-hidden rounded-2xl border border-line bg-white">
      {/* Cột giờ */}
      <div className="flex w-[92px] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-dashed border-line bg-mist px-2 py-4 text-center max-[640px]:w-[76px]">
        <span className="text-xl font-bold leading-none tabular-nums text-lagoon-700">
          {slotStart ? formatTime(slotStart) : "—"}
        </span>
        <span className="text-xs tabular-nums text-muted">
          {variant === "today"
            ? slotEnd
              ? `đến ${formatTime(slotEnd)}`
              : null
            : slotStart
              ? `${formatWeekdayShort(slotStart)} ${formatShortDate(slotStart)}`
              : null}
        </span>
      </div>

      {/* Thân phiếu */}
      <div className="flex min-w-0 grow items-start gap-3 p-4 max-[640px]:flex-wrap">
        {pet ? (
          <PetAvatar species={pet.species} size="md" />
        ) : detailState === "loading" ? (
          <Skeleton className="size-11 shrink-0 rounded-[14px]" />
        ) : (
          <span aria-hidden="true" className="size-11 shrink-0 rounded-[14px] bg-line-soft" />
        )}

        <div className="min-w-0 grow">
          <div>
            <span className="font-semibold">{petName}</span>
            <span className="ml-2 text-[13px] text-muted">
              {pet
                ? variant === "today"
                  ? `${SPECIES_LABELS[pet.species]} ${pet.breed}, hồ sơ nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`
                  : `${SPECIES_LABELS[pet.species]} ${pet.breed}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`
                : `Nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`}
            </span>
          </div>

          {detailState === "loading" && !detail ? (
            <Skeleton className="mt-1.5 h-4 w-48 rounded" />
          ) : detailState === "error" ? (
            <p className="text-[13px] text-muted">Chưa tải được chi tiết lịch.</p>
          ) : serviceNames.length > 0 ? (
            <p className="text-sm text-muted">{serviceNames.join(", ")}</p>
          ) : null}

          {hasChips && (
            <div className="mt-2 flex flex-wrap gap-2">
              {showPendingCost && (
                <TicketChip tone="warn" icon="alert">
                  Chờ khách xác nhận chi phí mới
                </TicketChip>
              )}
              {showWaitingReception && (
                <TicketChip tone="neutral" icon="timer">
                  Chờ lễ tân tiếp nhận
                </TicketChip>
              )}
              {petNotes && (
                <TicketChip tone="neutral" icon="note" title={petNotes}>
                  {petNotes}
                </TicketChip>
              )}
            </div>
          )}
        </div>

        {/* Cột phải */}
        <div className="flex shrink-0 flex-col items-end gap-2.5 max-[640px]:w-full max-[640px]:flex-row max-[640px]:items-center max-[640px]:justify-between">
          <StatusBadge status={appointment.status} />
          {variant === "today" &&
            (canOpenExecution(appointment.status) ? (
              <ButtonLink
                href={ROUTES.appointmentExecution(appointment.appointmentId)}
                variant="secondary"
                size="sm"
                aria-label={`Mở lịch của ${petName}`}
              >
                Mở
              </ButtonLink>
            ) : (
              <Link
                href={ROUTES.appointmentDetail(appointment.appointmentId)}
                aria-label={`Xem lịch của ${petName}`}
                className="font-semibold text-ink hover:text-lagoon"
              >
                Xem
              </Link>
            ))}
        </div>
      </div>
    </li>
  );
}

export function AppointmentTicket({
  appointment,
  variant,
}: {
  appointment: Appointment;
  variant: TicketVariant;
}) {
  // Chỉ variant "today" mới cần chi tiết dịch vụ và chi phí chờ xác nhận; "upcoming" không hiển thị các trường này.
  const detailId = variant === "today" ? appointment.appointmentId : null;
  const detail = useAppointment(detailId);
  const pet = usePet(appointment.petId);
  const detailState =
    detail.isPending || pet.isPending ? "loading" : detail.isError || pet.isError ? "error" : "ready";
  return (
    <AppointmentTicketView
      appointment={appointment}
      variant={variant}
      pet={pet.data}
      detail={detail.data}
      detailState={detailState}
    />
  );
}
