import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { isForbiddenError } from "@/lib/api/errors";
import type { Pet } from "@/lib/api/types";
import { getPetProfileRows } from "../pet-summary";

type PetProfilePanelProps = {
  pet: Pet | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

// MW-04 vùng 3 – hồ sơ thú cưng của lịch đang chọn, chỉ đọc. Dữ liệu từ GET /pets/{petId}; lỗi tải hồ sơ không che
// thông tin của lịch hẹn ở phần trên.
export function PetProfilePanel({ pet, isPending, error, onRetry }: PetProfilePanelProps) {
  if (pet === undefined) {
    if (isPending) {
      return (
        <p role="status" aria-busy="true" className="text-muted">
          Đang tải hồ sơ thú cưng…
        </p>
      );
    }
    if (isForbiddenError(error)) return <ForbiddenState />;
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2">Hồ sơ thú cưng</h3>
      {!pet.isActive && (
        <Alert tone="neutral" className="mb-3">
          Khách đã gỡ hồ sơ thú cưng này. Thông tin bên dưới là lần cập nhật cuối.
        </Alert>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
        {getPetProfileRows(pet).map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="break-words font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
