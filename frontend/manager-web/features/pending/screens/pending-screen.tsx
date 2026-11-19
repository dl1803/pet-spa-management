"use client";

// MW-04 Xử lý lịch hẹn chờ xác nhận – UI-Screens.md. Màn đọc loại lịch và lịch đang chọn từ URL (?type=, ?appointmentId=),
// phần giao diện và dữ liệu thật nằm ở PendingView. Lịch spa có vùng 5, 6 (nhân viên, xác nhận, từ chối) ở SpaAssignment;
// lịch lưu trú có vùng 6, 8 (chuồng, xác nhận, từ chối) ở HotelAssignment.
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES, withQuery } from "@/lib/routes";
import { PendingView } from "../components/pending-view";
import { parsePendingTypeFilter, type PendingTypeFilter } from "../list";

export function PendingScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = parsePendingTypeFilter(searchParams.get("type"));
  const requestedId = searchParams.get("appointmentId");

  function replaceUrl(nextType: PendingTypeFilter, appointmentId: string | null) {
    router.replace(
      withQuery(ROUTES.pending, { type: nextType === "all" ? null : nextType, appointmentId }),
      { scroll: false },
    );
  }

  return (
    <PendingView
      type={type}
      requestedId={requestedId}
      onTypeChange={(nextType) => replaceUrl(nextType, null)}
      onSelect={(appointmentId) => replaceUrl(type, appointmentId)}
    />
  );
}
