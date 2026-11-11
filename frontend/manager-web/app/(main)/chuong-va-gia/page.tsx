import { Suspense } from "react";
import { CagesScreenFallback } from "@/features/cages/components/cages-screen-fallback";
import { CagesScreen } from "@/features/cages/screens/cages-screen";

export default function Page() {
  return (
    <Suspense fallback={<CagesScreenFallback />}>
      <CagesScreen />
    </Suspense>
  );
}
