"use client";

// MW-02 vùng 2 đến 4 – Tải dữ liệu tổng quan từ API thật qua lib/api/endpoints (UI-Screens.md).
// Mọi khối spa tải xong mới hiển thị; lỗi một phần hiển thị chung một thông báo kèm "Thử lại".
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  BUFFER_MINUTES,
  buildLiveSnapshot,
  DASHBOARD_PAGE_SIZE,
  DASHBOARD_REFRESH_MS,
  keepStoreDay,
  needsDetail,
} from "@/features/dashboard/live-snapshot";
import type { DashboardSnapshot } from "@/features/dashboard/overview";
import { getAppointment, listAppointments } from "@/lib/api/endpoints/appointments";
import type { AppointmentDetail } from "@/lib/api/types";
import { appointmentKeys } from "@/lib/queries/appointments";
import { useStaffList } from "@/lib/queries/staff";
import { getStoreDateKey } from "@/lib/time";

// Giữ tham chiếu hằng để linter/typecheck không cảnh báo biến chưa dùng nếu chỉ dùng buildLiveSnapshot.
void BUFFER_MINUTES;

const POLLING = { refetchInterval: DASHBOARD_REFRESH_MS, refetchIntervalInBackground: false } as const;

async function fetchSpaToday() {
  const dateKey = getStoreDateKey(new Date());
  const page = await listAppointments({ type: "Spa", date: dateKey, page: 1, pageSize: DASHBOARD_PAGE_SIZE });
  return { dateKey, items: keepStoreDay(page.items, dateKey) };
}

type QueryState = {
  data: unknown;
  error: unknown;
  dataUpdatedAt: number;
  refetch: () => unknown;
};

export type DashboardSnapshotResult =
  | { status: "pending" }
  | { status: "error"; error: unknown; retry: () => void }
  | { status: "success"; snapshot: DashboardSnapshot };

export function useDashboardSnapshot(): DashboardSnapshotResult {
  const spaToday = useQuery({
    queryKey: appointmentKeys.dashboardSpaToday,
    queryFn: fetchSpaToday,
    ...POLLING,
  });
  const pendingSpa = useQuery({
    queryKey: appointmentKeys.dashboardPendingCount("Spa"),
    queryFn: () => listAppointments({ status: "Pending", type: "Spa", page: 1, pageSize: 1 }),
    ...POLLING,
  });
  const pendingHotel = useQuery({
    queryKey: appointmentKeys.dashboardPendingCount("Hotel"),
    queryFn: () => listAppointments({ status: "Pending", type: "Hotel", page: 1, pageSize: 1 }),
    ...POLLING,
  });
  const staff = useStaffList();

  const detailItems = (spaToday.data?.items ?? []).filter(needsDetail);
  const details = useQueries({
    queries: detailItems.map((item) => ({
      queryKey: appointmentKeys.detail(item.appointmentId),
      queryFn: () => getAppointment(item.appointmentId),
      ...POLLING,
    })),
  });

  const required: QueryState[] = [spaToday, pendingSpa, pendingHotel, staff, ...details];

  const failed = required.find((query) => query.error !== null && query.data === undefined);
  if (failed) {
    return {
      status: "error",
      error: failed.error,
      retry: () => {
        for (const query of required) {
          void query.refetch();
        }
      },
    };
  }

  if (
    spaToday.data === undefined ||
    pendingSpa.data === undefined ||
    pendingHotel.data === undefined ||
    staff.data === undefined
  ) {
    return { status: "pending" };
  }

  const loadedDetails: AppointmentDetail[] = [];
  for (const detailQuery of details) {
    if (detailQuery.data === undefined) {
      return { status: "pending" };
    }
    loadedDetails.push(detailQuery.data);
  }

  const updatedAt = Math.max(...required.map((query) => query.dataUpdatedAt));

  return {
    status: "success",
    snapshot: buildLiveSnapshot({
      now: new Date(updatedAt).toISOString(),
      staff: staff.data.items,
      pendingCounts: { spa: pendingSpa.data.total, hotel: pendingHotel.data.total },
      spaItems: spaToday.data.items,
      details: loadedDetails,
    }),
  };
}
