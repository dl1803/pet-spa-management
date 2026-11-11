import { Suspense } from "react";
import { HotelBookingScreen } from "@/features/booking/screens/hotel-booking-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HotelBookingScreen />
    </Suspense>
  );
}

