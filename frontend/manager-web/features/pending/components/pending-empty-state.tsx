import { EmptyState } from "@/components/ui/empty-state";

// MW-04 Hành vi: hết lịch chờ xác nhận thì hiện trạng thái trống (UI-Screens, mục Đề xuất).
export function PendingEmptyState() {
  return (
    <EmptyState
      icon="check-circle"
      title="Không còn lịch chờ xác nhận."
      description="Lịch mới đặt hoặc khách đã đổi lịch sẽ xuất hiện ở đây."
    />
  );
}
