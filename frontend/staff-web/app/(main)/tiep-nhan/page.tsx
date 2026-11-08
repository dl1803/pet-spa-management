import { Suspense } from "react";
import { CheckInScreen } from "@/features/reception-check-in/screens/check-in-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CheckInScreen />
    </Suspense>
  );
}

