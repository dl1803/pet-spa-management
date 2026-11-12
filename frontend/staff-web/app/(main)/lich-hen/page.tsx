import { Suspense } from "react";
import { ReceptionAppointmentsScreen } from "@/features/reception-appointments/screens/reception-appointments-screen";
import { RoleGate } from "@/lib/auth/role-gate";

export default function Page() {
  return (
    <RoleGate allow={["Receptionist"]}>
      <Suspense fallback={null}>
        <ReceptionAppointmentsScreen />
      </Suspense>
    </RoleGate>
  );
}

