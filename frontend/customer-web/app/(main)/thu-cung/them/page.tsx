import { Suspense } from "react";
import { PetFormScreen } from "@/features/pets/screens/pet-form-screen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PetFormScreen />
    </Suspense>
  );
}

