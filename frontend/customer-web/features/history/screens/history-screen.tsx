"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PetGlyph } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { HistoryCard } from "@/features/history/components/history-card";
import type { Pet } from "@/lib/api/types";
import { sortByStart } from "@/lib/appointments";
import { MOCK_APPOINTMENTS, MOCK_PAYMENTS, MOCK_PETS } from "@/lib/mock-data";
import { ROUTES, withQuery } from "@/lib/routes";

const HISTORY_PAGE_SIZE = 10;
const TITLE = "Lịch sử dịch vụ";
const DESCRIPTION = "Các lịch hẹn đã hoàn tất của từng bé.";

function PetHistory({ pet }: { pet: Pet }) {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);

  const completed = sortByStart(
    MOCK_APPOINTMENTS.filter((appointment) => appointment.status === "Completed" && appointment.petId === pet.petId),
    "desc",
  );

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
            <HistoryCard
              appointment={appointment}
              payments={MOCK_PAYMENTS.filter((payment) => payment.appointmentId === appointment.appointmentId)}
            />
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

  const pets = MOCK_PETS;
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
