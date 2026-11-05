import { Suspense } from "react";
import { WorkHistoryScreen } from "@/features/work-history/screens/work-history-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WorkHistoryScreen />
    </Suspense>
  );
}
