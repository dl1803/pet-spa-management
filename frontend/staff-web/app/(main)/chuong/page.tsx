import { CagesScreen } from "@/features/reception-cages/screens/cages-screen";
import { RoleGate } from "@/lib/auth/role-gate";

export default function Page() {
  return (
    <RoleGate allow={["Receptionist"]}>
      <CagesScreen />
    </RoleGate>
  );
}
