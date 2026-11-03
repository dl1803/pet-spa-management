import { Suspense } from "react";
import { ProfileScreen } from "@/features/profile/screens/profile-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProfileScreen />
    </Suspense>
  );
}

