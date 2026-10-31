import { Suspense } from "react";
import { AppointmentsScreen } from "@/features/appointments/screens/appointments-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppointmentsScreen />
    </Suspense>
  );
}

