import { Suspense } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { WorkHistoryScreen } from "@/features/work-history/screens/work-history-screen";

export default function Page() {
  return (
    <RoleGate allow={["SpaStaff"]}>
      <Suspense fallback={null}>
        <WorkHistoryScreen />
      </Suspense>
    </RoleGate>
  );
}
