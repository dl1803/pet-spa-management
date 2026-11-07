import { Suspense } from "react";
import { ReceptionBookingScreen } from "@/features/reception-booking/screens/reception-booking-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReceptionBookingScreen />
    </Suspense>
  );
}

