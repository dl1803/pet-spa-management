import { Suspense } from "react";
import { StaffScreenFallback } from "@/features/staff/components/staff-screen-fallback";
import { StaffScreen } from "@/features/staff/screens/staff-screen";

export default function Page() {
  return (
    <Suspense fallback={<StaffScreenFallback />}>
      <StaffScreen />
    </Suspense>
  );
}
