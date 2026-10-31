"use client";

// MW-04 Xử lý lịch hẹn chờ xác nhận – UI-Screens.md. Hiện mới có vùng 5 (nhân viên spa phụ trách),
// dùng dữ liệu mô phỏng; chưa gọi API.
import { Controller, useForm } from "react-hook-form";
import { StaffAssignmentPanel } from "../components/staff-assignment-panel";
import { MOCK_STAFF_ASSIGNMENTS, type MockStaffAssignment } from "../mock-data";
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
