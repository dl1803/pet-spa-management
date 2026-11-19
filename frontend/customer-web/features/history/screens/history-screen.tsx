"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppointmentErrorState } from "@/components/domain/appointment-error-state";
import { PetGlyph } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryCard } from "@/features/history/components/history-card";
import type { Pet } from "@/lib/api/types";
import { sortByStart } from "@/lib/appointments";
import { useAppointments } from "@/lib/queries/appointments";
import { usePets } from "@/lib/queries/pets";
import { ROUTES, withQuery } from "@/lib/routes";

const HISTORY_PAGE_SIZE = 10;
const TITLE = "Lịch sử dịch vụ";
const DESCRIPTION = "Các lịch hẹn đã hoàn tất của từng bé.";

function HistorySkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Đang tải lịch sử dịch vụ…</span>
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-[88px] rounded-2xl" />
      ))}
    </div>
  );
}

function PetHistory({ pet }: { pet: Pet }) {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const { data, error, isFetching, refetch } = useAppointments({ status: "Completed", petId: pet.petId });

  if (error !== null) {
    return <AppointmentErrorState error={error} isRetrying={isFetching} onRetry={() => void refetch()} />;
  }
  if (data === undefined) {
    return <HistorySkeleton />;
  }

  // Sắp xếp ở web theo giờ hẹn giảm dần: API trả theo ngày tạo (UI-Screens G-06).
  const completed = sortByStart(data, "desc");

  if (completed.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="history"
          title={`${pet.name} chưa có lịch hẹn hoàn tất`}
          description="Các lịch đã hoàn tất của bé sẽ hiện ở đây."
          action={
            <ButtonLink href={withQuery(ROUTES.spaBooking, { petId: pet.petId })} variant="secondary">
              <Icon name="plus" />
              Đặt lịch spa
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {completed.slice(0, visibleCount).map((appointment) => (
          <li key={appointment.appointmentId}>
            <HistoryCard appointment={appointment} />
          </li>
        ))}
      </ul>
      {completed.length > visibleCount && (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={() => setVisibleCount((count) => count + HISTORY_PAGE_SIZE)}>
            Xem thêm
          </Button>
        </div>
      )}
    </>
  );
}

export function HistoryScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, isFetching, refetch } = usePets();

  if (error !== null) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <AppointmentErrorState error={error} isRetrying={isFetching} onRetry={() => void refetch()} />
      </>
    );
  }
  if (data === undefined) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <HistorySkeleton />
      </>
    );
  }

  const pets = data.items;
  const pet = pets.find((item) => item.petId === searchParams.get("petId")) ?? pets[0];

  if (!pet) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <Card>
          <EmptyState
            icon="paw"
            title="Chưa có thú cưng"
            description="Thêm hồ sơ cho bé để xem lịch sử dịch vụ."
            action={
              <ButtonLink href={ROUTES.petCreate} variant="secondary">
                <Icon name="plus" />
                Thêm thú cưng
              </ButtonLink>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION}>
        <SegmentedControl
          label="Chọn thú cưng"
          items={pets.map((item) => ({
            value: item.petId,
            label: (
              <>
                <PetGlyph species={item.species} className="size-5" />
                {item.name}
              </>
            ),
          }))}
          value={pet.petId}
          onChange={(petId) => router.replace(withQuery(ROUTES.history, { petId }), { scroll: false })}
        />
      </PageHeader>
      <PetHistory key={pet.petId} pet={pet} />
    </>
  );
}
