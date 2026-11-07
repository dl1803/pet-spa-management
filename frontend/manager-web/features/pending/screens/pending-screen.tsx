"use client";

// MW-04 Xử lý lịch hẹn chờ xác nhận – UI-Screens.md. Hiện có vùng 3, 4, 5, 6, 7 (lịch spa) và vùng 3, 4, 6, 8 (lịch lưu trú),
// dùng dữ liệu mô phỏng; chưa gọi API.
import { useState } from "react";
import { useToast } from "@/components/feedback/toast";
import { formatAppointmentCode } from "@/lib/format";
import type { ConfirmHotelRequest, ConfirmSpaRequest } from "@/lib/api/types";
import { CageAssignmentCard } from "../components/cage-assignment-card";
import { PendingEmptyState } from "../components/pending-empty-state";
import { StaffAssignmentCard } from "../components/staff-assignment-card";
import { MOCK_CAGE_ASSIGNMENTS, MOCK_STAFF_ASSIGNMENTS, type MockCageAssignment, type MockStaffAssignment } from "../mock-data";
import { getSpaConfirmMessage } from "../spa-summary";

const REJECTED_MESSAGE = "Đã từ chối lịch hẹn. Khách đã được thông báo.";

export function PendingScreen() {
  const { showSuccess } = useToast();
  // Lịch đã xử lý rời danh sách, như khi backend đổi trạng thái khỏi Chờ xác nhận.
  const [staffAssignments, setStaffAssignments] = useState<MockStaffAssignment[]>(MOCK_STAFF_ASSIGNMENTS);
  const [cageAssignments, setCageAssignments] = useState<MockCageAssignment[]>(MOCK_CAGE_ASSIGNMENTS);

  function removeStaffAssignment(appointmentId: string) {
    setStaffAssignments((current) => current.filter((item) => item.appointmentId !== appointmentId));
  }

  function removeCageAssignment(appointmentId: string) {
    setCageAssignments((current) => current.filter((item) => item.appointmentId !== appointmentId));
  }

  function handleConfirmSpa(assignment: MockStaffAssignment, { staffIds }: ConfirmSpaRequest) {
    removeStaffAssignment(assignment.appointmentId);
    showSuccess(getSpaConfirmMessage(assignment, staffIds));
  }

  function handleRejectSpa({ appointmentId }: MockStaffAssignment) {
    removeStaffAssignment(appointmentId);
    showSuccess(REJECTED_MESSAGE);
  }

  function handleConfirm({ appointmentId, suggestions, cages }: MockCageAssignment, { cageId }: ConfirmHotelRequest) {
    const cage = [suggestions.cage, ...cages].find((item) => item.cageId === cageId);
    if (!cage) return;
    removeCageAssignment(appointmentId);
    showSuccess(`Đã xác nhận ${formatAppointmentCode(appointmentId)}, gán chuồng ${cage.code}`);
  }

  function handleReject({ appointmentId }: MockCageAssignment) {
    removeCageAssignment(appointmentId);
    showSuccess(REJECTED_MESSAGE);
  }

  const isEmpty = staffAssignments.length === 0 && cageAssignments.length === 0;

  return (
    <div>
      <h1>Lịch hẹn chờ xác nhận</h1>
      {isEmpty ? (
        <div className="mt-6 max-w-[720px] rounded-2xl border border-line bg-white">
          <PendingEmptyState />
        </div>
      ) : (
        <div className="mt-6 flex max-w-[720px] flex-col gap-4">
          {staffAssignments.map((assignment) => (
            <StaffAssignmentCard
              key={assignment.appointmentId}
              {...assignment}
              onConfirm={(request) => handleConfirmSpa(assignment, request)}
              onReject={() => handleRejectSpa(assignment)}
            />
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
      )}
    </div>
  );
}
