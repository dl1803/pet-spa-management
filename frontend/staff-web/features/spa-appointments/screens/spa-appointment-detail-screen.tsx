"use client";

// SW-03 Chi tiết lịch hẹn (Nhân viên spa, vùng 1 và 3) – UI-Screens.md

import { useParams } from "next/navigation";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentDetailHeader } from "@/features/spa-appointments/components/appointment-detail-header";
import { PetProfileCard } from "@/features/spa-appointments/components/pet-profile-card";
import { isForbiddenError, toApiError } from "@/lib/api/errors";
import { useAppointment } from "@/lib/queries/appointments";
import { usePet } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";

const DETAIL_REFETCH_MS = 30_000;

export function SpaAppointmentDetailScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const detail = useAppointment(appointmentId, { refetchInterval: DETAIL_REFETCH_MS });
  const pet = usePet(detail.data?.petId ?? null);

  if (detail.isPending) {
    return (
      <div>
        <Skeleton className="mb-4 h-24 w-full rounded-[28px]" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (detail.error && !detail.data) {
    if (isForbiddenError(detail.error)) {
      return <ForbiddenState />;
    }
    if (toApiError(detail.error).status === 404) {
      return (
        <EmptyState
          icon="clipboard"
          title="Không tìm thấy lịch hẹn"
          description="Lịch hẹn không tồn tại hoặc không thuộc phạm vi được phân công cho bạn."
          action={
            <ButtonLink href={ROUTES.appointments} variant="secondary">
              Về danh sách lịch hẹn
            </ButtonLink>
          }
        />
      );
    }
    return <ErrorAlert error={detail.error} />;
  }

  if (!detail.data) {
    return null;
  }

  return (
    <div>
      <AppointmentDetailHeader appointment={detail.data} pet={pet.data} petFailed={pet.isError} />
      <PetProfileCard pet={pet.data} isPending={pet.isPending} error={pet.error} />
    </div>
  );
}
