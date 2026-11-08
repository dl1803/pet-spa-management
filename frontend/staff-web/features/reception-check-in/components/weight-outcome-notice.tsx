import { Alert } from "@/components/feedback/alert";
import type { WeightNotice } from "@/features/reception-check-in/check-in";

export function WeightOutcomeNotice({ notice }: { notice: WeightNotice }) {
  return (
    <Alert tone={notice.tone} icon={notice.icon} title={notice.title}>
      {notice.body}
    </Alert>
  );
}

