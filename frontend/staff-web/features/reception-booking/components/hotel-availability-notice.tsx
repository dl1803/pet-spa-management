import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { NO_CAPACITY_MESSAGE, NO_CAPACITY_TITLE } from "@/features/reception-booking/forms";

export type AvailabilityNoticeState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; error: unknown; onRetry: () => void }
  | { kind: "available"; message: string }
  | { kind: "full" };

export function HotelAvailabilityNotice({ state }: { state: AvailabilityNoticeState }) {
  return (
    <div aria-live="polite" className="empty:hidden">
      {state.kind === "checking" && (
        <div aria-busy="true" className="h-[52px] animate-pulse rounded-xl bg-line-soft">
          <span className="sr-only">Đang kiểm tra chỗ…</span>
        </div>
      )}
      {state.kind === "error" && (
        <div className="flex flex-col items-start gap-2">
          <ErrorAlert error={state.error} className="w-full" />
          <Button variant="secondary" size="sm" onClick={state.onRetry}>
            Thử lại
          </Button>
        </div>
      )}
      {state.kind === "available" && <Alert tone="success">{state.message}</Alert>}
      {state.kind === "full" && (
        <Alert tone="danger" title={NO_CAPACITY_TITLE}>
          {NO_CAPACITY_MESSAGE}
        </Alert>
      )}
    </div>
  );
}

