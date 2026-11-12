import { Suspense } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { ServiceExecutionScreen } from "@/features/service-execution/screens/service-execution-screen";

export default function Page() {
  return (
    <RoleGate allow={["SpaStaff"]}>
      <Suspense fallback={null}>
        <ServiceExecutionScreen />
      </Suspense>
    </RoleGate>
  );
}
