import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ChangeFormLoadStateProps = {
  // null khi đang tải lần đầu.
  error: unknown;
  isRetrying: boolean;
  onRetry: () => void;
};

// Hồ sơ thú cưng (và danh mục dịch vụ với lịch spa) phải tải xong trước khi dựng form để giá trị mặc định đúng.
export function ChangeFormLoadState({ error, isRetrying, onRetry }: ChangeFormLoadStateProps) {
  if (error !== null) {
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

  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Đang tải thông tin đổi lịch…</span>
      <Card>
        <CardBody>
          <Skeleton className="h-6 w-40 rounded-[10px]" />
          <Skeleton className="mt-4 h-16 rounded-xl" />
          <Skeleton className="mt-2 h-16 rounded-xl" />
        </CardBody>
      </Card>
    </div>
  );
}
