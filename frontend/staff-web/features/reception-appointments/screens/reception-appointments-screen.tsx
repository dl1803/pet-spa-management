"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceptionAppointmentsTable } from "@/features/reception-appointments/components/reception-appointments-table";
import {
  APPOINTMENT_FILTERS,
  countByFilter,
  matchesFilter,
  resolveDateKey,
  sortByTime,
  type AppointmentFilter,
} from "@/features/reception-appointments/list";
import { useReceptionAppointments } from "@/features/reception-appointments/use-reception-appointments";
import { formatDate, formatLongDate } from "@/lib/format";
import { ROUTES, withQuery } from "@/lib/routes";
import { buildStoreDateTime, getStoreDateKey } from "@/lib/time";

const dateInputClass =
  "block min-h-11 rounded-[10px] border border-line bg-white px-3 text-ink tabular-nums focus:border-lagoon focus:outline-none focus:ring-3 focus:ring-lagoon/20";

export function ReceptionAppointmentsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const [filter, setFilter] = useState<AppointmentFilter>("all");

  const dateKey = resolveDateKey(searchParams.get("date"), todayKey);
  const dayStart = buildStoreDateTime(dateKey, "12:00");

  const {
    rows: dayRows,
    unloadedCount,
    hasData,
    isPending,
    isFetching,
    isForbidden,
    error,
    retry,
  } = useReceptionAppointments(dateKey);

  if (isForbidden) {
    return <ForbiddenState />;
  }

  const rows = sortByTime(dayRows, dateKey);
  const counts = countByFilter(rows, dateKey);
  const visibleRows = rows.filter((row) => matchesFilter(row.appointment, filter, dateKey));

  const title = dateKey === todayKey ? "Lịch hẹn hôm nay" : `Lịch hẹn ngày ${formatDate(dayStart)}`;

  return (
    <>
      <PageHeader title={title} description={`${formatLongDate(dayStart)}, toàn cửa hàng`}>
        <input
          type="date"
          aria-label="Chọn ngày"
          value={dateKey}
          onChange={(event) => {
            if (event.target.value !== "") {
              router.replace(withQuery(ROUTES.appointments, { date: event.target.value }), { scroll: false });
            } else {
              router.replace(ROUTES.appointments, { scroll: false });
            }
          }}
          className={dateInputClass}
        />
        <ButtonLink href={ROUTES.booking}>
          <Icon name="calendar-plus" className="size-[18px]" />
          Đặt lịch thay khách
        </ButtonLink>
      </PageHeader>

      <div role="group" aria-label="Lọc lịch hẹn" className="mb-2 flex flex-wrap gap-2">
        {APPOINTMENT_FILTERS.map((item) => (
          <FilterChip
            key={item.value}
            active={filter === item.value}
            count={counts[item.value]}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </FilterChip>
        ))}
      </div>
      <p className="mb-4 text-xs text-muted">Danh sách chưa gồm lịch đã hoàn tất và lịch đã hủy.</p>

      {error && (
        <div className="mb-4 flex flex-col items-start gap-3">
          <ErrorAlert error={error} className="w-full" />
          <Button variant="secondary" onClick={retry} loading={isFetching} loadingText="Đang tải lại…">
            Thử lại
          </Button>
        </div>
      )}

      {unloadedCount > 0 && (
        <Alert tone="warn" className="mb-4">
          Còn {unloadedCount} lịch hẹn chưa tải được vì mỗi trạng thái chỉ tải tối đa 100 lịch.
        </Alert>
      )}

      {isPending ? (
        <Card>
          <div className="space-y-3 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      ) : hasData ? (
        <Card>
          {rows.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Không có lịch hẹn trong ngày này."
              description="Lịch hẹn của cửa hàng trong ngày sẽ hiện ở đây."
            />
          ) : visibleRows.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Không có lịch hẹn trong nhóm này."
              description="Chọn nhóm khác để xem các lịch hẹn còn lại."
            />
          ) : (
            <ReceptionAppointmentsTable rows={visibleRows} dateKey={dateKey} />
          )}
        </Card>
      ) : null}
    </>
  );
}
