import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { CompleteFeedback } from "@/features/service-execution/execution";

const REASONS_ID = "complete-blockers";

type CompleteActionProps = {
  // Lý do khóa tính ở web; rỗng thì nút bật.
  blockers: string[];
  feedback: CompleteFeedback | null;
  onComplete: () => void;
};

// SW-11 vùng 7 – Nút “Hoàn tất lịch hẹn” khi lịch `InProgress` (UI-Screens.md). Web chỉ khóa để dễ dùng; backend vẫn kiểm tra lại (409).
// 409 PHOTO_REQUIRED / SERVICES_INCOMPLETE: lý do dưới nút; 409 INVALID_TRANSITION và lỗi khác: `ErrorAlert`. 403 do màn xử lý.
export function CompleteAction({ blockers, feedback, onComplete }: CompleteActionProps) {
  const isServerReason = feedback?.kind === "reason";
  const reasons = isServerReason ? [feedback.reason] : blockers;

  return (
    <>
      <Button
        size="lg"
        block
        disabled={blockers.length > 0}
        aria-describedby={reasons.length > 0 ? REASONS_ID : undefined}
        onClick={onComplete}
      >
        <Icon name="check-circle" className="size-[18px]" />
        Hoàn tất lịch hẹn
      </Button>
      {reasons.length > 0 && (
        <ul id={REASONS_ID} role={isServerReason ? "alert" : undefined} className="flex flex-col gap-1">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-1.5 text-xs leading-4 text-muted">
              <Icon name="lock" className="mt-px size-3.5" />
              {reason}
            </li>
          ))}
        </ul>
      )}
      {feedback?.kind === "error" && <ErrorAlert error={feedback.error} />}
    </>
  );
}
