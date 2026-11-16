import { Suspense } from "react";
import { PendingScreenFallback } from "@/features/pending/components/pending-screen-fallback";
import { PendingScreen } from "@/features/pending/screens/pending-screen";

export default function Page() {
  return (
    <Suspense fallback={<PendingScreenFallback />}>
      <PendingScreen />
    </Suspense>
  );
}
