import { Suspense } from "react";
import { AppointmentsByRole } from "./appointments-by-role";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppointmentsByRole />
    </Suspense>
  );
}

