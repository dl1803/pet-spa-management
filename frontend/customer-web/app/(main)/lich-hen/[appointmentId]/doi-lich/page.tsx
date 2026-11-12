import { Suspense } from "react";
import { AppointmentChangeScreen } from "@/features/booking/screens/appointment-change-screen";

export default function AppointmentChangePage() {
  return (
    <Suspense fallback={null}>
      <AppointmentChangeScreen />
    </Suspense>
  );
}

