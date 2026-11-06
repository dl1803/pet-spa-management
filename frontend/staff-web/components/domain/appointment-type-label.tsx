import { Icon } from "@/components/icons";
import type { AppointmentType } from "@/lib/api/types";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";

// Lưu trú kèm số đêm thì hiện "Lưu trú, 2 đêm" (một chuỗi để không bị tách thành nhiều nút văn bản).
export function AppointmentTypeLabel({ type, nights }: { type: AppointmentType; nights?: number }) {
  const label = APPOINTMENT_TYPE_LABELS[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
      <Icon name={type === "Spa" ? "droplet" : "bed"} className={`size-3.5 ${type === "Spa" ? "text-lagoon" : "text-[#6A5BC4]"}`} />
      {nights === undefined ? label : `${label}, ${nights} đêm`}
    </span>
  );
}

