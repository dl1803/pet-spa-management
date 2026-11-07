import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/api/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/labels";

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={status === "Paid" ? "pay-1" : "pay-0"}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
