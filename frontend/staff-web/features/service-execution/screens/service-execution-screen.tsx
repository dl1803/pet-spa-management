"use client";

// SW-11 Thực hiện dịch vụ – UI-Screens.md

import { useParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { ExecutionWorkspace } from "@/features/service-execution/components/execution-workspace";
import { createMockCompletedExecutions, createMockExecutions, findMockExecution } from "@/features/service-execution/mock-data";
import { ROUTES } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

export function ServiceExecutionScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [now] = useState(() => new Date());

  // Dữ liệu mô phỏng: chưa gọi API (nối API thật ở bước sau).
  const initial = findMockExecution([...createMockExecutions(now), ...createMockCompletedExecutions()], appointmentId);

  if (initial === null) {
    return (
      <EmptyState
        icon="clipboard"
        title="Không tìm thấy lịch hẹn"
        description="Lịch hẹn không tồn tại hoặc không thuộc phạm vi được phân công cho bạn."
        action={
          <ButtonLink href={ROUTES.appointments} variant="secondary">
            Về danh sách lịch hẹn
          </ButtonLink>
        }
      />
    );
  }

  return <ExecutionWorkspace key={appointmentId} initial={initial} todayKey={getStoreDateKey(now)} />;
}
