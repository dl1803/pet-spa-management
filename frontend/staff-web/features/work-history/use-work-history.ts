"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { loadCompletedSpaAppointments } from "@/features/work-history/load-history";
import { buildWorkHistoryEntries, type WorkHistoryEntry } from "@/features/work-history/list";
import { getAppointment } from "@/lib/api/endpoints/appointments";
import { getPet } from "@/lib/api/endpoints/pets";
import type { Appointment, AppointmentDetail, Species } from "@/lib/api/types";
import { appointmentKeys } from "@/lib/queries/appointments";
import { petKeys } from "@/lib/queries/pets";

// Nằm dưới khóa gốc của lịch hẹn: hoàn tất lịch ở SW-11 làm mới appointmentKeys.all nên danh sách này cũng được tải lại.
export const WORK_HISTORY_QUERY_KEY = [...appointmentKeys.all, "work-history"] as const;

export function useWorkHistoryAppointments() {
  return useQuery({ queryKey: WORK_HISTORY_QUERY_KEY, queryFn: loadCompletedSpaAppointments });
}

// Chỉ các dòng đang hiển thị mới gọi GET /appointments/{id} (tên dịch vụ) và GET /pets/{id} (loài), tránh gọi cho toàn bộ lịch sử.
// Dùng chung khóa với SW-11 nên dữ liệu đã tải được tái sử dụng. Lỗi tải một dòng chỉ làm dòng đó thiếu dịch vụ hoặc hình.
export function useWorkHistoryEntries(appointments: Appointment[]): WorkHistoryEntry[] {
  const detailQueries = useQueries({
    queries: appointments.map((appointment) => ({
      queryKey: appointmentKeys.detail(appointment.appointmentId),
      queryFn: () => getAppointment(appointment.appointmentId),
    })),
  });

  const petIds = [...new Set(appointments.map((appointment) => appointment.petId))];
  const petQueries = useQueries({
    queries: petIds.map((petId) => ({ queryKey: petKeys.detail(petId), queryFn: () => getPet(petId) })),
  });

  const details = new Map<string, AppointmentDetail>();
  detailQueries.forEach((query, index) => {
    if (query.data) details.set(appointments[index].appointmentId, query.data);
  });
  const speciesByPet = new Map<string, Species>();
  petQueries.forEach((query, index) => {
    if (query.data) speciesByPet.set(petIds[index], query.data.species);
  });

  return buildWorkHistoryEntries(appointments, details, speciesByPet);
}
