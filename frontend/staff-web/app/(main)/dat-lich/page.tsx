import { Suspense } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { ReceptionBookingScreen } from "@/features/reception-booking/screens/reception-booking-screen";

export default function Page() {
  return (
    <RoleGate allow={["Receptionist"]}>
      <Suspense fallback={null}>
        <ReceptionBookingScreen />
      </Suspense>
    </RoleGate>
  );
}
