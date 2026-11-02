"use client";

// MW-04 Xử lý lịch hẹn chờ xác nhận – UI-Screens.md. Hiện có vùng 5 (nhân viên spa phụ trách) và vùng 6, 8
// (chọn chuồng, xác nhận, từ chối lịch lưu trú), dùng dữ liệu mô phỏng; chưa gọi API.
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useToast } from "@/components/feedback/toast";
import { formatAppointmentCode } from "@/lib/format";
import type { ConfirmHotelRequest } from "@/lib/api/types";
import { CageAssignmentCard } from "../components/cage-assignment-card";
import { StaffAssignmentPanel } from "../components/staff-assignment-panel";
import { MOCK_CAGE_ASSIGNMENTS, MOCK_STAFF_ASSIGNMENTS, type MockCageAssignment, type MockStaffAssignment } from "../mock-data";
import { getInitialStaffIds } from "../staff-selection";

function StaffAssignmentCard({ appointmentId, title, suggestions }: MockStaffAssignment) {
  const { control } = useForm<{ staffIds: string[] }>({
    defaultValues: { staffIds: getInitialStaffIds(suggestions) },
  });
  const titleId = `assignment-${appointmentId}`;

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-line bg-white p-5">
      <h2 id={titleId} className="mb-4">{title}</h2>
      <Controller
        control={control}
        name="staffIds"
        render={({ field }) => (
          <StaffAssignmentPanel
            suggestions={suggestions}
            selectedStaffIds={field.value}
            onSelectedStaffIdsChange={field.onChange}
          />
        )}
      />
    </section>
  );
}

export function PendingScreen() {
  const { showSuccess } = useToast();
  // Lịch lưu trú đã xử lý rời danh sách, như khi backend đổi trạng thái khỏi Chờ xác nhận.
  const [cageAssignments, setCageAssignments] = useState<MockCageAssignment[]>(MOCK_CAGE_ASSIGNMENTS);

  function removeCageAssignment(appointmentId: string) {
    setCageAssignments((current) => current.filter((item) => item.appointmentId !== appointmentId));
  }

  function handleConfirm({ appointmentId, suggestions, cages }: MockCageAssignment, { cageId }: ConfirmHotelRequest) {
    const cage = [suggestions.cage, ...cages].find((item) => item.cageId === cageId);
    if (!cage) return;
    removeCageAssignment(appointmentId);
    showSuccess(`Đã xác nhận ${formatAppointmentCode(appointmentId)}, gán chuồng ${cage.code}`);
  }

  function handleReject({ appointmentId }: MockCageAssignment) {
    removeCageAssignment(appointmentId);
    showSuccess("Đã từ chối lịch hẹn. Khách đã được thông báo.");
  }

  return (
    <div>
      <h1>Lịch hẹn chờ xác nhận</h1>
      <div className="mt-6 flex max-w-[720px] flex-col gap-4">
        {MOCK_STAFF_ASSIGNMENTS.map((assignment) => (
          <StaffAssignmentCard key={assignment.appointmentId} {...assignment} />
        ))}
        {cageAssignments.map((assignment) => (
          <CageAssignmentCard
            key={assignment.appointmentId}
            {...assignment}
            onConfirm={(request) => handleConfirm(assignment, request)}
            onReject={() => handleReject(assignment)}
          />
        ))}
      </div>
    </div>
  );
}
