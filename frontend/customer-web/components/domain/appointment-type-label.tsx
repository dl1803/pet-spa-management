import { Icon } from "@/components/icons";
import type { AppointmentType } from "@/lib/api/types";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";

export function AppointmentTypeLabel({ type }: { type: AppointmentType }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
      <Icon name={type === "Spa" ? "droplet" : "bed"} className={`size-3.5 ${type === "Spa" ? "text-lagoon" : "text-[#6A5BC4]"}`} />
      {APPOINTMENT_TYPE_LABELS[type]}
    </span>
  );
}

