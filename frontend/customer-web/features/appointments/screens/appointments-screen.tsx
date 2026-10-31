"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppointmentTicket } from "@/components/domain/appointment-ticket";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pager } from "@/components/ui/pager";
import { Tabs } from "@/components/ui/tabs";
import {
  APPOINTMENT_TABS,
  APPOINTMENTS_PAGE_SIZE,
  describeAppointment,
  filterAppointments,
  paginate,
  parsePage,
  parseTab,
  parseType,
  type AppointmentTab,
} from "@/features/appointments/list";
import type { AppointmentType } from "@/lib/api/types";
import { sortByStart } from "@/lib/appointments";
import { formatNameList } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";
import { MOCK_APPOINTMENTS, MOCK_PETS } from "@/lib/mock-data";
import { ROUTES, withQuery } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

const EMPTY_STATES: Record<AppointmentTab, { title: string; description: string }> = {
  upcoming: { title: "Chưa có lịch hẹn sắp tới", description: "Đặt lịch spa để bé được chăm sóc đúng giờ." },
  completed: { title: "Chưa có lịch hẹn đã hoàn tất", description: "Các lịch đã hoàn tất sẽ hiện ở đây." },
  cancelled: { title: "Không có lịch hẹn đã hủy", description: "Các lịch đã hủy sẽ hiện ở đây." },
};

export function AppointmentsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [now] = useState(() => new Date());
  const todayKey = getStoreDateKey(now);

  const pets = MOCK_PETS;
  const appointments = MOCK_APPOINTMENTS;
  const petById = new Map(pets.map((pet) => [pet.petId, pet]));

  const tab = parseTab(searchParams.get("tab"));
  const type = parseType(searchParams.get("type"));

  const tabItems = APPOINTMENT_TABS.map((item) => ({
    ...item,
    count: filterAppointments(appointments, item.value, type).length,
  }));
  const sorted = sortByStart(filterAppointments(appointments, tab, type), tab === "upcoming" ? "asc" : "desc");
  const { page, items } = paginate(sorted, parsePage(searchParams.get("page")), APPOINTMENTS_PAGE_SIZE);

  function navigate(next: { tab: AppointmentTab; type: AppointmentType | null; page?: number }) {
    const href = withQuery(ROUTES.appointments, {
      tab: next.tab,
      type: next.type,
      page: next.page && next.page > 1 ? next.page : null,
    });
    router.replace(href, { scroll: false });
  }

  const names = formatNameList(pets.map((pet) => pet.name));
  const emptyState = EMPTY_STATES[tab];

  return (
    <>
      <PageHeader
        title="Lịch hẹn của tôi"
        description={names ? `Lịch spa và lưu trú của ${names}.` : "Lịch spa và lưu trú của bạn."}
      >
        <ButtonLink href={ROUTES.history} variant="secondary">
          <Icon name="history" />
          Lịch sử dịch vụ
        </ButtonLink>
        <ButtonLink href={ROUTES.spaBooking}>
          <Icon name="plus" />
          Đặt lịch spa
        </ButtonLink>
      </PageHeader>

      <Tabs
        label="Nhóm trạng thái lịch hẹn"
        items={tabItems}
        value={tab}
        onChange={(value) => navigate({ tab: value, type })}
      />

      <div role="group" aria-label="Lọc theo loại lịch" className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={type === null} onClick={() => navigate({ tab, type: null })}>
          Tất cả
        </FilterChip>
        <FilterChip active={type === "Spa"} icon="droplet" onClick={() => navigate({ tab, type: "Spa" })}>
          {APPOINTMENT_TYPE_LABELS.Spa}
        </FilterChip>
        <FilterChip active={type === "Hotel"} icon="bed" onClick={() => navigate({ tab, type: "Hotel" })}>
          {APPOINTMENT_TYPE_LABELS.Hotel}
        </FilterChip>
      </div>

      <div role="tabpanel">
        {items.length === 0 ? (
          <Card>
            <EmptyState
              icon="calendar"
              title={emptyState.title}
              description={emptyState.description}
              action={
                tab === "upcoming" ? (
                  <ButtonLink href={ROUTES.spaBooking} variant="secondary">
                    <Icon name="plus" />
                    Đặt lịch spa
                  </ButtonLink>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((appointment) => {
              const pet = petById.get(appointment.petId);
              return (
                <li key={appointment.appointmentId}>
                  <AppointmentTicket
                    appointment={appointment}
                    petName={pet?.name ?? appointment.petName ?? "—"}
                    species={pet?.species ?? null}
                    description={describeAppointment(appointment)}
                    todayKey={todayKey}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <Pager
          page={page}
          pageSize={APPOINTMENTS_PAGE_SIZE}
          total={sorted.length}
          onPageChange={(next) => navigate({ tab, type, page: next })}
        />
      </div>
    </>
  );
}

