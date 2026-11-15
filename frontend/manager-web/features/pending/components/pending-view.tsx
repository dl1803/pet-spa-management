"use client";

import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { isForbiddenError } from "@/lib/api/errors";
import { usePendingAppointments } from "@/lib/queries/appointments";
import {
  PENDING_TYPE_FILTERS,
  filterPendingAppointments,
  getPendingSubtitle,
  parsePendingTypeFilter,
  resolveSelectedAppointmentId,
  sortPendingAppointments,
  type PendingTypeFilter,
} from "../list";
import { PendingDetail } from "./pending-detail";
import { PendingEmptyState } from "./pending-empty-state";
import { PendingList } from "./pending-list";

type PendingViewProps = {
  type: PendingTypeFilter;
  // Lịch được yêu cầu chọn (từ URL); không còn trong danh sách thì chọn lịch đầu tiên.
  requestedId: string | null;
  onTypeChange: (type: PendingTypeFilter) => void;
  onSelect: (appointmentId: string) => void;
};

// MW-04 vùng 1, 2, 3 – Xử lý lịch hẹn chờ xác nhận (UI-Screens.md). Danh sách từ GET /appointments?status=Pending,
// hồ sơ thú cưng từ GET /pets/{petId}. Lọc theo loại làm ở web trên cùng một lần tải để có đủ số Spa, lưu trú ở tiêu đề.
export function PendingView({ type, requestedId, onTypeChange, onSelect }: PendingViewProps) {
  const { data, error, isPending, refetch } = usePendingAppointments();
  const all = data === undefined ? [] : sortPendingAppointments(data.items);
  const visible = filterPendingAppointments(all, type);
  const selectedId = resolveSelectedAppointmentId(visible, requestedId);
  const selected = visible.find((appointment) => appointment.appointmentId === selectedId);

  function renderContent() {
    if (data === undefined) {
      if (isPending) {
        return (
          <p role="status" aria-busy="true" className="text-muted">
            Đang tải danh sách lịch chờ xác nhận…
          </p>
        );
      }
      if (isForbiddenError(error)) return <ForbiddenState />;
      return (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={error} className="w-full" />
          <Button variant="secondary" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      );
    }

    if (all.length === 0) {
      return (
        <div className="max-w-[720px] rounded-2xl border border-line bg-white">
          <PendingEmptyState />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {data.total > data.items.length && (
          <Alert tone="warn">
            Có {data.total} lịch chờ xác nhận, đang hiển thị {data.items.length} lịch đầu tiên. Xử lý bớt rồi tải lại trang để xem tiếp.
          </Alert>
        )}
        <div className="grid grid-cols-[minmax(280px,380px)_1fr] items-start gap-5 max-[980px]:grid-cols-1">
          {visible.length === 0 ? (
            <Card>
              <p className="p-5 text-muted">Không có lịch nào thuộc loại này đang chờ xác nhận.</p>
            </Card>
          ) : (
            <PendingList appointments={visible} selectedId={selectedId} onSelect={onSelect} />
          )}
          {selected && <PendingDetail key={selected.appointmentId} appointment={selected} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Lịch hẹn chờ xác nhận</h1>
          {data !== undefined && <p className="text-muted">{getPendingSubtitle(data.items)}</p>}
        </div>
        {data !== undefined && (
          <SegmentedControl
            label="Loại lịch hẹn"
            items={PENDING_TYPE_FILTERS}
            value={type}
            onChange={(value) => onTypeChange(parsePendingTypeFilter(value))}
          />
        )}
      </div>
      {renderContent()}
    </div>
  );
}
