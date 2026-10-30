import { Suspense } from "react";
import { SpaBookingScreen } from "@/features/booking/screens/spa-booking-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SpaBookingScreen />
    </Suspense>
  );
}

