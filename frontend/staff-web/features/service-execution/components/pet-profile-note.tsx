import { Alert } from "@/components/feedback/alert";
import { endSentence } from "@/features/service-execution/execution";
import type { Pet } from "@/lib/api/types";
import { TEMPERAMENT_LABELS } from "@/lib/labels";

// SW-11 vùng 2 – Lưu ý từ hồ sơ (UI-Screens.md): ghi chú, tính cách, đặc điểm lông của hồ sơ thú cưng.
export function PetProfileNote({ pet }: { pet: Pet }) {
  const notes = pet.notes?.trim();
  const coatNote = pet.coatNote?.trim();
  const sentences = [
    notes ? endSentence(notes) : null,
    `Tính cách ${TEMPERAMENT_LABELS[pet.temperament].toLocaleLowerCase("vi-VN")}.`,
    coatNote ? endSentence(`Lông ${coatNote}`) : null,
  ].filter((sentence) => sentence !== null);

  return (
    <Alert tone="neutral" icon="note" className="mb-4">
      <b className="font-semibold">Lưu ý từ hồ sơ:</b> {sentences.join(" ")}
    </Alert>
  );
}
