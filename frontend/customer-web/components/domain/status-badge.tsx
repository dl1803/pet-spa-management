import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/lib/api/types";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";

const STATUS_TONES: Record<AppointmentStatus, BadgeTone> = {
  Pending: "st-1",
  Confirmed: "st-2",
  Received: "st-3",
  InProgress: "st-4",
  InStay: "st-4",
  Completed: "st-5",
  Cancelled: "st-6",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>;
}

