import { Suspense } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { CheckOutScreen } from "@/features/reception-check-out/screens/check-out-screen";

export default function Page() {
  return (
    <RoleGate allow={["Receptionist"]}>
      <Suspense fallback={null}>
        <CheckOutScreen />
      </Suspense>
    </RoleGate>
  );
}
