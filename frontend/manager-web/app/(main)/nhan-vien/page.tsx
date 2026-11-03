import { Suspense } from "react";
import { StaffScreen } from "@/features/staff/screens/staff-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StaffScreen />
    </Suspense>
  );
}
