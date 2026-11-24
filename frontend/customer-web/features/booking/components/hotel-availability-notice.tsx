import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NO_CAPACITY_MESSAGE, NO_CAPACITY_TITLE } from "@/features/booking/forms";
import { STORE_HOTLINE } from "@/lib/store-info";

export type HotelAvailabilityNoticeState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; error: unknown }
  | { kind: "available"; message: string }
  | { kind: "full" }
  | { kind: "locked" }
  | { kind: "overlap" };

type HotelAvailabilityNoticeProps = {
  notice: HotelAvailabilityNoticeState;
  onRetry: () => void;
};

// Vùng thông báo đọc theo trạng thái: còn chỗ, hết chỗ, chồng lên lịch đang đổi, đang kiểm tra, lỗi kiểm tra, tài khoản bị khóa.
export function HotelAvailabilityNotice({ notice, onRetry }: HotelAvailabilityNoticeProps) {
  return (
    <div aria-live="polite" className="mt-3 empty:hidden">
      {notice.kind === "checking" && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Icon name="timer" className="size-4" />
          Đang kiểm tra chỗ trống…
        </p>
      )}
      {notice.kind === "available" && (
        <Alert tone="success" role={null} title="Còn chỗ">
          {notice.message}
        </Alert>
      )}
      {notice.kind === "full" && (
        <Alert tone="danger" role={null} title={NO_CAPACITY_TITLE}>
          {NO_CAPACITY_MESSAGE}
        </Alert>
      )}
      {notice.kind === "overlap" && (
        <Alert tone="info" role={null} title="Chồng với lịch hiện tại">
          Khoảng ngày này chồng với lịch bạn đang đổi nên chưa kiểm tra chính xác được chỗ trống. Cửa hàng sẽ kiểm tra khi bạn
          gửi yêu cầu; nếu hết chỗ, bạn sẽ được báo ngay.
        </Alert>
      )}
      {notice.kind === "locked" && (
        <Alert tone="danger" icon="lock" role={null} title="Tài khoản tạm thời không thể tự đặt lịch">
          Bạn đã vắng mặt quá 3 lần trong 30 ngày gần đây. Vui lòng liên hệ cửa hàng qua hotline{" "}
          <strong>{STORE_HOTLINE}</strong> để được hỗ trợ đặt lịch.
        </Alert>
      )}
      {notice.kind === "error" && (
        <div className="flex flex-col items-start gap-2">
          <ErrorAlert error={notice.error} className="w-full" />
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      )}
    </div>
  );
}

