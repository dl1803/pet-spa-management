import { Suspense } from "react";
import { LoginScreen } from "@/features/auth/screens/login-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
