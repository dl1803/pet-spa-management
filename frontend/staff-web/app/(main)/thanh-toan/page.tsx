import { Suspense } from "react";
import { CounterPaymentScreen } from "@/features/reception-payments/screens/counter-payment-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CounterPaymentScreen />
    </Suspense>
  );
}
