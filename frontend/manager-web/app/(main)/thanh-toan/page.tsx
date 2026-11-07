import { Suspense } from "react";
import { PaymentsScreenFallback } from "@/features/payments/components/payments-screen-fallback";
import { PaymentsScreen } from "@/features/payments/screens/payments-screen";

export default function Page() {
  return (
    <Suspense fallback={<PaymentsScreenFallback />}>
      <PaymentsScreen />
    </Suspense>
  );
}
