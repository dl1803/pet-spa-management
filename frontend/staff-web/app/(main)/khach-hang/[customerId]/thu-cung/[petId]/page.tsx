import { Suspense } from "react";
import { PetProfileScreen } from "@/features/reception-customers/screens/pet-profile-screen";

export default function PetProfilePage() {
  return (
    <Suspense fallback={null}>
      <PetProfileScreen />
    </Suspense>
  );
}

