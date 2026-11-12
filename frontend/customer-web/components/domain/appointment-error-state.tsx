import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { isForbiddenError, isNotFoundError } from "@/lib/api/errors";
import { ROUTES } from "@/lib/routes";

type AppointmentErrorStateProps = {
  error: unknown;
  isRetrying: boolean;
  onRetry: () => void;
};

export function AppointmentErrorState({ error, isRetrying, onRetry }: AppointmentErrorStateProps) {
  if (isForbiddenError(error)) {
    return <ForbiddenState />;
  }

  if (isNotFoundError(error)) {
    return (
      <NotFoundState
        title="Không tìm thấy lịch hẹn"
        description="Không tìm thấy dữ liệu, có thể đã bị thay đổi."
        action={
          <ButtonLink href={ROUTES.appointments} variant="secondary">
            Về lịch hẹn của tôi
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div>
      <ErrorAlert error={error} />
      <div className="mt-4">
        <Button variant="secondary" onClick={onRetry} disabled={isRetrying}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}

