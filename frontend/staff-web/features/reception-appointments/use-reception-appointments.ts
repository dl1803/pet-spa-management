"use client";

import { useQueries } from "@tanstack/react-query";
import {
  belongsToDate,
  buildReceptionListParams,
  buildReceptionRows,
  countUnloadedAppointments,
  mergeAppointmentPages,
  RECEPTION_LIST_REFETCH_MS,
  RECEPTION_LISTED_STATUSES,
} from "@/features/reception-appointments/list";
import { getAppointment, listAppointments } from "@/lib/api/endpoints/appointments";
import { getPet } from "@/lib/api/endpoints/pets";
import { isForbiddenError } from "@/lib/api/errors";
import type { AppointmentDetail, Pet } from "@/lib/api/types";
import { appointmentKeys } from "@/lib/queries/appointments";
import { petKeys } from "@/lib/queries/pets";

// Lịch hẹn toàn cửa hàng của một ngày cho Lễ tân.
// Danh sách: gọi riêng từng trạng thái còn xử lý (GET /appointments?status=...), lọc ngày ở web.
// Thú cưng (loài, giống): GET /pets/{id} cho các thú cưng của lịch trong ngày.
// Nhân viên: GET /appointments/{id} cho lịch spa đã được xếp nhân viên (lịch Chờ xác nhận chưa có).
export function useReceptionAppointments(dateKey: string) {
  const listQueries = useQueries({
    queries: RECEPTION_LISTED_STATUSES.map((status) => {
      const params = buildReceptionListParams(status);
      return {
        queryKey: appointmentKeys.list(params),
        queryFn: () => listAppointments(params),
        refetchInterval: RECEPTION_LIST_REFETCH_MS,
      };
    }),
  });

  const pages = listQueries.flatMap((query) => (query.data ? [query.data] : []));
  const dayAppointments = mergeAppointmentPages(pages).filter((appointment) => belongsToDate(appointment, dateKey));

  const petIds = [...new Set(dayAppointments.map((appointment) => appointment.petId))];
  const petQueries = useQueries({
    queries: petIds.map((petId) => ({ queryKey: petKeys.detail(petId), queryFn: () => getPet(petId) })),
  });

  const staffAppointmentIds = dayAppointments
    .filter((appointment) => appointment.type === "Spa" && appointment.status !== "Pending")
    .map((appointment) => appointment.appointmentId);
  const detailQueries = useQueries({
    queries: staffAppointmentIds.map((appointmentId) => ({
      queryKey: appointmentKeys.detail(appointmentId),
      queryFn: () => getAppointment(appointmentId),
    })),
  });

  const pets = new Map<string, Pet>();
  petQueries.forEach((query, index) => {
    if (query.data) pets.set(petIds[index], query.data);
  });
  const details = new Map<string, AppointmentDetail>();
  detailQueries.forEach((query, index) => {
    if (query.data) details.set(staffAppointmentIds[index], query.data);
  });

  return {
    rows: buildReceptionRows(dayAppointments, pets, details),
    unloadedCount: countUnloadedAppointments(pages),
    hasData: pages.length > 0,
    isPending: listQueries.every((query) => query.isPending),
    isForbidden: listQueries.some((query) => isForbiddenError(query.error)),
    error: listQueries.find((query) => query.isError)?.error ?? null,
    retry: () => {
      for (const query of listQueries) {
        if (query.isError) void query.refetch();
      }
    },
  };
}
