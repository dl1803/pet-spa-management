import { Suspense } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { SpaAppointmentDetailScreen } from "@/features/spa-appointments/screens/spa-appointment-detail-screen";

export default function Page() {
  return (
    <RoleGate allow={["SpaStaff"]}>
      <Suspense fallback={null}>
        <SpaAppointmentDetailScreen />
      </Suspense>
    </RoleGate>
  );
}
