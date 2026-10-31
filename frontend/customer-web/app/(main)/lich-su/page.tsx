import { Suspense } from "react";
import { HistoryScreen } from "@/features/history/screens/history-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HistoryScreen />
    </Suspense>
  );
}

