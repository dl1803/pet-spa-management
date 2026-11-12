import { Suspense } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { NotificationsScreen } from "@/features/notifications/screens/notifications-screen";

export default function Page() {
  return (
    <RoleGate allow={["SpaStaff"]}>
      <Suspense fallback={null}>
        <NotificationsScreen />
      </Suspense>
    </RoleGate>
  );
}
