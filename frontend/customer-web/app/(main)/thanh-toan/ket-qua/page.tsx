import { Suspense } from "react";
import { PaymentReturnScreen } from "@/features/appointments/screens/payment-return-screen";

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturnScreen />
    </Suspense>
  );
}
