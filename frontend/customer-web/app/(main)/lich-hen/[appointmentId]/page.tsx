import { Suspense } from "react";
import { AppointmentDetailScreen } from "@/features/appointments/screens/appointment-detail-screen";

export default function AppointmentDetailPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentDetailScreen />
    </Suspense>
  );
}

