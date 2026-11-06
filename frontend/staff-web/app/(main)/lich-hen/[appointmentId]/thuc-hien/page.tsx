import { Suspense } from "react";
import { ServiceExecutionScreen } from "@/features/service-execution/screens/service-execution-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ServiceExecutionScreen />
    </Suspense>
  );
}
