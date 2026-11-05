import { Suspense } from "react";
import { NotificationsScreen } from "@/features/notifications/screens/notifications-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NotificationsScreen />
    </Suspense>
  );
}
