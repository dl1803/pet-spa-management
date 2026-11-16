"use client";

// MW-04 Xử lý lịch hẹn chờ xác nhận – UI-Screens.md. Màn đọc loại lịch và lịch đang chọn từ URL (?type=, ?appointmentId=),
// phần giao diện và dữ liệu thật nằm ở PendingView. Vùng 5 – 8 (nhân viên, chuồng, xác nhận, từ chối) chưa có ở màn này.
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
