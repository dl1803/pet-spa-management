import { Suspense } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { CheckInScreen } from "@/features/reception-check-in/screens/check-in-screen";

export default function Page() {
  return (
    <RoleGate allow={["Receptionist"]}>
      <Suspense fallback={null}>
        <CheckInScreen />
      </Suspense>
    </RoleGate>
  );
}
