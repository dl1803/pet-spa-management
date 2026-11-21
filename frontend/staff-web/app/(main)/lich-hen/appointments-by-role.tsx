"use client";

import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { ReceptionAppointmentsScreen } from "@/features/reception-appointments/screens/reception-appointments-screen";
import { SpaAppointmentsScreen } from "@/features/spa-appointments/screens/spa-appointments-screen";
import { useSession } from "@/lib/auth/session-context";

// /lich-hen dùng chung cho hai vai trò (UI-Screens SW-02): Lễ tân thấy cả cửa hàng, Nhân viên spa thấy lịch được phân công.
export function AppointmentsByRole() {
  const { staffRole } = useSession();
  if (staffRole === "Receptionist") return <ReceptionAppointmentsScreen />;
  if (staffRole === "SpaStaff") return <SpaAppointmentsScreen />;
  return <ForbiddenState />;
}
