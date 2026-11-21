"use client";

// SW-02 Lịch hẹn (Nhân viên spa, vùng 4 đến 6) – UI-Screens.md

import { useEffect, useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentTicket } from "@/features/spa-appointments/components/appointment-ticket";
import {
  buildSpaListParams,
  groupSpaAppointments,
  SPA_LIST_REFETCH_MS,
} from "@/features/spa-appointments/list";
import { isForbiddenError } from "@/lib/api/errors";
import { formatLongDate } from "@/lib/format";
import { useAppointments } from "@/lib/queries/appointments";
import { buildStoreDateTime, getStoreDateKey } from "@/lib/time";

export function SpaAppointmentsScreen() {
  const [todayKey, setTodayKey] = useState(() => getStoreDateKey(new Date()));

  // Cập nhật lại todayKey khi qua nửa đêm (sau 00:00) theo chu kỳ làm mới để tránh stale date state
  useEffect(() => {
    const timer = setInterval(() => {
      const currentKey = getStoreDateKey(new Date());
      setTodayKey((prev) => (prev !== currentKey ? currentKey : prev));
    }, SPA_LIST_REFETCH_MS);
    return () => clearInterval(timer);
  }, []);

  const confirmed = useAppointments(buildSpaListParams("Confirmed"), {
    refetchInterval: SPA_LIST_REFETCH_MS,
  });
  const received = useAppointments(buildSpaListParams("Received"), {
    refetchInterval: SPA_LIST_REFETCH_MS,
  });
  const inProgress = useAppointments(buildSpaListParams("InProgress"), {
    refetchInterval: SPA_LIST_REFETCH_MS,
  });

  const queries = [confirmed, received, inProgress];
  const isForbidden = queries.some((query) => isForbiddenError(query.error));
  const hasAnyData = queries.some((query) => query.data !== undefined);
  const error = queries.find((query) => query.error)?.error;

  if (isForbidden) {
    return <ForbiddenState />;
  }

  return (
    <div>
      <PageHeader
        title="Lịch được phân công cho bạn"
        description={`${formatLongDate(buildStoreDateTime(todayKey, "12:00"))}.`}
      />

      {!hasAnyData && error ? (
        <ErrorAlert error={error} />
      ) : !hasAnyData ? (
        <div>
          <Skeleton className="mb-3 h-[104px] w-full rounded-2xl" />
          <Skeleton className="h-[104px] w-full rounded-2xl" />
        </div>
      ) : (
        (() => {
          const successfulLists = queries
            .filter((query) => query.data !== undefined)
            .map((query) => query.data!.items);
          const groups = groupSpaAppointments(successfulLists, todayKey);

          return (
            <>
              {/* Cảnh báo suy giảm dữ liệu nếu có query bị lỗi mạng nhưng vẫn có dữ liệu từ query khác */}
              {error && <ErrorAlert error={error} className="mb-6" />}

              {/* Khối Hôm nay */}
              <section aria-labelledby="spa-today-heading" className="mb-8">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 id="spa-today-heading">Hôm nay</h2>
                  <span className="text-[13px] text-muted">{`${groups.today.length} lịch`}</span>
                </div>

                {groups.today.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {groups.today.map((appointment) => (
                      <AppointmentTicket
                        key={appointment.appointmentId}
                        appointment={appointment}
                        variant="today"
                      />
                    ))}
                  </ul>
                ) : (
                  <Card>
                    <EmptyState
                      icon="calendar"
                      title="Hôm nay bạn chưa được phân công lịch nào."
                      description="Lịch được phân công cho bạn trong ngày sẽ hiện ở đây."
                    />
                  </Card>
                )}
              </section>

              {/* Khối Sắp tới */}
              {groups.upcoming.length > 0 && (
                <section aria-labelledby="spa-upcoming-heading">
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 id="spa-upcoming-heading">Sắp tới</h2>
                    <span className="text-[13px] text-muted">{`${groups.upcoming.length} lịch`}</span>
                  </div>

                  <ul className="flex flex-col gap-3">
                    {groups.upcoming.map((appointment) => (
                      <AppointmentTicket
                        key={appointment.appointmentId}
                        appointment={appointment}
                        variant="upcoming"
                      />
                    ))}
                  </ul>

                  {groups.hiddenUpcoming > 0 && (
                    <p className="mt-3 text-[13px] text-muted">
                      {`Còn ${groups.hiddenUpcoming} lịch sắp tới chưa hiển thị.`}
                    </p>
                  )}
                </section>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
