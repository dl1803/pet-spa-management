"use client";

// MW-04 Xử lý lịch hẹn chờ xác nhận – UI-Screens.md. Hiện mới có vùng 5 (nhân viên spa phụ trách),
// dùng dữ liệu mô phỏng; chưa gọi API.
import { useState } from "react";
import { StaffAssignmentPanel } from "../components/staff-assignment-panel";
import { MOCK_STAFF_ASSIGNMENTS, type MockStaffAssignment } from "../mock-data";
import { getInitialStaffIds } from "../staff-selection";

function StaffAssignmentCard({ appointmentId, title, suggestions }: MockStaffAssignment) {
  const [selectedStaffIds, setSelectedStaffIds] = useState(() => getInitialStaffIds(suggestions));
  const titleId = `assignment-${appointmentId}`;

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-line bg-white p-5">
      <h2 id={titleId} className="mb-4">{title}</h2>
      <StaffAssignmentPanel
        suggestions={suggestions}
        selectedStaffIds={selectedStaffIds}
        onSelectedStaffIdsChange={setSelectedStaffIds}
      />
    </section>
  );
}

export function PendingScreen() {
  return (
    <div>
      <h1>Lịch hẹn chờ xác nhận</h1>
      <div className="mt-6 flex max-w-[720px] flex-col gap-4">
        {MOCK_STAFF_ASSIGNMENTS.map((assignment) => (
          <StaffAssignmentCard key={assignment.appointmentId} {...assignment} />
        ))}
      </div>
    </div>
  );
}
