"use client";

import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CardBody, CardFooter } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { isForbiddenError } from "@/lib/api/errors";
import type { Appointment } from "@/lib/api/types";
import {
  useConfirmAppointment,
  useRefreshAppointments,
  useRejectAppointment,
  useSpaSuggestions,
} from "@/lib/queries/appointments";
import { classifySpaActionError, type SpaActionFailure } from "../spa-action-error";
import { getSpaAssignedMessage, getSpaRejectedMessage } from "../spa-summary";
import { getInitialStaffIds, isStaffSelectionComplete } from "../staff-selection";
import { StaffAssignmentPanel } from "./staff-assignment-panel";

type SpaAssignmentProps = {
  appointment: Appointment;
  // Gọi sau khi xác nhận hoặc từ chối thành công để màn chọn lịch kế tiếp.
  onProcessed: () => void;
};

type InlineFailure = Extract<SpaActionFailure, { kind: "message" | "error" }>;

// MW-04 vùng 5, 6 và hộp thoại MW-04·D1, D2 cho lịch spa Chờ xác nhận (UI-Screens.md). Đề xuất từ GET /appointments/{id}/suggestions,
// xác nhận POST /appointments/{id}/confirm, từ chối POST /appointments/{id}/reject. Backend quyết định trùng lịch, ngoài ca, số người
// và số tiền (BR-26); web chỉ gửi nhân viên đã chọn. Kết quả là phần thân và chân của thẻ chi tiết nên trả về hai khối liền nhau.
export function SpaAssignment({ appointment, onProcessed }: SpaAssignmentProps) {
  const { appointmentId } = appointment;
  const { showError, showSuccess } = useToast();
  const { data: suggestions, error, isPending } = useSpaSuggestions(appointmentId);
  const refreshAppointments = useRefreshAppointments();
  const confirm = useConfirmAppointment();
  const reject = useRejectAppointment();
  // null: quản lý chưa tự chọn, dùng người được đề xuất (kể cả khi đề xuất vừa được tải lại).
  const [chosenStaffIds, setChosenStaffIds] = useState<string[] | null>(null);
  const [failure, setFailure] = useState<InlineFailure | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [outOfShift, setOutOfShift] = useState<{ staffIds: string[]; detail: string | null } | null>(null);

  const staffIds = chosenStaffIds ?? (suggestions ? getInitialStaffIds(suggestions) : []);
  const isBusy = confirm.isPending || reject.isPending;
  const canConfirm = suggestions !== undefined && isStaffSelectionComplete(staffIds, suggestions.staffRequired);

  function handleFailure(caught: unknown, selectedStaffIds: string[]) {
    const result = classifySpaActionError(caught, suggestions?.staffRequired ?? appointment.staffRequired ?? 1);
    if (result.kind === "out-of-shift") {
      // Giữ nguyên lựa chọn: quản lý chọn lại hoặc vẫn xác nhận.
      setOutOfShift({ staffIds: selectedStaffIds, detail: result.detail });
      return;
    }
    if (result.kind === "stale") {
      showError(result.error);
      return;
    }
    if (result.kind === "message" && result.resetSelection) setChosenStaffIds(null);
    setFailure(result);
  }

  function submitConfirm(selectedStaffIds: string[], confirmOutOfShift: boolean) {
    if (isBusy || suggestions === undefined) return;
    setFailure(null);
    confirm.mutate(
      {
        appointmentId,
        request: confirmOutOfShift ? { staffIds: selectedStaffIds, confirmOutOfShift: true } : { staffIds: selectedStaffIds },
      },
      {
        onSuccess: () => {
          showSuccess(getSpaAssignedMessage(appointmentId, selectedStaffIds, suggestions));
          onProcessed();
        },
        onError: (caught) => handleFailure(caught, selectedStaffIds),
      },
    );
  }

  function handleReject() {
    setIsRejecting(false);
    if (isBusy) return;
    setFailure(null);
    reject.mutate(appointmentId, {
      onSuccess: () => {
        showSuccess(getSpaRejectedMessage(appointmentId));
        onProcessed();
      },
      onError: (caught) => handleFailure(caught, []),
    });
  }

  // Đã xử lý xong: ẩn thao tác để không gửi lần hai; lịch biến mất khỏi danh sách khi tải lại xong.
  if (confirm.isSuccess || reject.isSuccess) {
    return (
      <div className="border-t border-line-soft">
        <CardBody>
          <p role="status" className="text-muted">
            Đã xử lý lịch hẹn, đang cập nhật danh sách…
          </p>
        </CardBody>
      </div>
    );
  }

  function renderStaffArea() {
    if (suggestions === undefined) {
      if (isPending) {
        return (
          <p role="status" aria-busy="true" className="text-muted">
            Đang tải đề xuất nhân viên…
          </p>
        );
      }
      if (isForbiddenError(error)) return <ForbiddenState />;
      return (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={error} className="w-full" />
          <Button variant="secondary" onClick={() => void refreshAppointments()}>
            Thử lại
          </Button>
        </div>
      );
    }
    return (
      <StaffAssignmentPanel suggestions={suggestions} selectedStaffIds={staffIds} onSelectedStaffIdsChange={setChosenStaffIds} />
    );
  }

  return (
    <>
      <div className="border-t border-line-soft">
        <CardBody>
          {renderStaffArea()}
          {failure?.kind === "message" && (
            <Alert tone="danger" className="mt-4">
              {failure.message}
            </Alert>
          )}
          {failure?.kind === "error" && <ErrorAlert error={failure.error} className="mt-4" />}
        </CardBody>
      </div>
      <CardFooter>
        <Button variant="danger" disabled={isBusy} onClick={() => setIsRejecting(true)}>
          <Icon name="x-circle" className="size-[18px]" />
          Từ chối: cửa hàng không thể đáp ứng
        </Button>
        <div className="ml-auto">
          <Button disabled={!canConfirm || isBusy} onClick={() => submitConfirm(staffIds, false)}>
            {confirm.isPending ? "Đang xác nhận…" : "Xác nhận lịch hẹn"}
          </Button>
        </div>
      </CardFooter>

      {isRejecting && (
        <ConfirmDialog
          icon="x-circle"
          tone="danger"
          title="Từ chối lịch hẹn này?"
          description="Dùng khi cửa hàng không có nhân viên hoặc chuồng phù hợp."
          confirmLabel="Từ chối lịch hẹn"
          onConfirm={handleReject}
          onCancel={() => setIsRejecting(false)}
        >
          <p>
            Lịch chuyển sang Đã hủy với lý do cửa hàng không thể đáp ứng. Khách có tài khoản nhận thông báo kèm lý do;
            khách vãng lai được lễ tân gọi báo.
          </p>
        </ConfirmDialog>
      )}

      {outOfShift && (
        <ConfirmDialog
          icon="alert"
          title="Nhân viên ngoài ca làm"
          description="Nhân viên này nằm ngoài ca làm, bạn vẫn muốn chọn?"
          confirmLabel="Vẫn xác nhận"
          cancelLabel="Chọn lại"
          onConfirm={() => {
            const pendingRequest = outOfShift;
            setOutOfShift(null);
            submitConfirm(pendingRequest.staffIds, true);
          }}
          onCancel={() => setOutOfShift(null)}
        >
          {outOfShift.detail && <p>{outOfShift.detail}</p>}
        </ConfirmDialog>
      )}
    </>
  );
}
