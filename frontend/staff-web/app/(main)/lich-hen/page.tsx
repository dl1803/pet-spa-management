import { Suspense } from "react";
import { ReceptionAppointmentsScreen } from "@/features/reception-appointments/screens/reception-appointments-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReceptionAppointmentsScreen />
    </Suspense>
  );
}

