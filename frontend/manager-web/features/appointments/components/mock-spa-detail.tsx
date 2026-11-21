"use client";

import { useState } from "react";
import { AppointmentHeader } from "@/features/appointments/components/appointment-header";
import { EvidencePhotos } from "@/features/appointments/components/evidence-photos";
import { StatusUpdateCard } from "@/features/appointments/components/status-update-card";
import type { MockSpaAppointment } from "@/features/appointments/evidence";
import { advanceMockSpaStatus } from "@/features/appointments/mock-status";
import type { SpaStatusAction } from "@/features/appointments/status-update";

// Lịch spa của dữ liệu mô phỏng: trạng thái giữ trong state của trang, mất khi tải lại (dữ liệu mô phỏng chưa lưu đâu cả).
// Bỏ cùng nhánh mô phỏng khi trang chi tiết nối API thật.
export function MockSpaDetail({ found }: { found: MockSpaAppointment }) {
  const { appointment, species, photos } = found;
  const [status, setStatus] = useState(appointment.status);
  const current = { ...appointment, status };

  async function handleAdvance(action: SpaStatusAction) {
    // Ném ApiError 409 như API thật; StatusUpdateCard bắt lỗi, dòng setStatus bên dưới không chạy.
    const result = advanceMockSpaStatus(current, photos, action);
    setStatus(result.status);
  }

  return (
    <>
      <AppointmentHeader appointment={current} species={species} />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1100px]:grid-cols-1">
        <EvidencePhotos photos={photos} petName={appointment.petName ?? "thú cưng"} />
        <StatusUpdateCard appointment={current} photos={photos} onAdvance={handleAdvance} />
      </div>
    </>
  );
}
