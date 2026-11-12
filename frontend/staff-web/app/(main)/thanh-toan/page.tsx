import { Suspense } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { CounterPaymentScreen } from "@/features/reception-payments/screens/counter-payment-screen";

export default function Page() {
  return (
    <RoleGate allow={["Receptionist"]}>
      <Suspense fallback={null}>
        <CounterPaymentScreen />
      </Suspense>
    </RoleGate>
  );
}
