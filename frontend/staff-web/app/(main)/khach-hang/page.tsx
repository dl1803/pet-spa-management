import { Suspense } from "react";
import { CustomersScreen } from "@/features/reception-customers/screens/customers-screen";

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersScreen />
    </Suspense>
  );
}

