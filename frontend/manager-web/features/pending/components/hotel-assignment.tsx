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
  useHotelSuggestions,
  useRefreshAppointments,
  useRejectAppointment,
} from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { usePet } from "@/lib/queries/pets";
import { countNights } from "@/lib/time";
import { buildCageChoices, buildSuggestedCageChoices, canConfirmCage, getInitialCageId } from "../cage-selection";
import { classifyHotelActionError, type HotelActionFailure } from "../hotel-action-error";
import { getStayAssignedMessage, getStayRejectedMessage } from "../stay-summary";
import { CageAssignmentPanel } from "./cage-assignment-panel";

type HotelAssignmentProps = {
  appointment: Appointment;
  // Gọi sau khi xác nhận hoặc từ chối thành công để màn chọn lịch kế tiếp.
  onProcessed: () => void;
};

type InlineFailure = Extract<HotelActionFailure, { kind: "message" | "error" }>;

// MW-04 vùng 6, 8 và hộp thoại MW-04·D1 cho lịch lưu trú Chờ xác nhận (UI-Screens.md). Đề xuất chuồng từ GET /appointments/{id}/suggestions,
// chuồng khác cùng loài từ GET /cages, xác nhận POST /appointments/{id}/confirm { cageId }, từ chối POST /appointments/{id}/reject.
// Backend quyết định chuồng phù hợp và không trùng đêm (CAGE_CONFLICT); web chỉ gửi chuồng đã chọn.
// Kết quả là phần thân và chân của thẻ chi tiết nên trả về hai khối liền nhau.
export function HotelAssignment({ appointment, onProcessed }: HotelAssignmentProps) {
  const { appointmentId, petId, sizeGroup, plannedCheckIn, plannedCheckOut } = appointment;
  const { showError, showSuccess } = useToast();
  const { data: suggestions, error, isPending } = useHotelSuggestions(appointmentId);
  const { data: cagesPage, isError: isCagesError, refetch: refetchCages } = useCages();
  const { data: pet } = usePet(petId);
  const refreshAppointments = useRefreshAppointments();
  const confirm = useConfirmAppointment();
  const reject = useRejectAppointment();
  // null: quản lý chưa tự chọn, dùng chuồng được đề xuất (kể cả khi đề xuất vừa được tải lại).
  const [chosenCageId, setChosenCageId] = useState<string | null>(null);
  const [failure, setFailure] = useState<InlineFailure | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Lịch lưu trú luôn có đủ ngày nhận và ngày trả; thiếu thì coi như không có chuồng để chọn.
  // Khi có danh sách chuồng thật và biết loài thú cưng, ghép cùng chuồng đề xuất để chọn được chuồng khác phù hợp (UI-Screens MW-04 vùng 8);
  // nếu GET /cages chưa xong hoặc lỗi, vẫn dùng được chuồng hệ thống đề xuất.
  const staySpecies = suggestions?.cage?.species ?? pet?.species ?? null;
  const choices =
    suggestions !== undefined && plannedCheckIn && plannedCheckOut
      ? cagesPage !== undefined && staySpecies !== null
        ? buildCageChoices(suggestions, cagesPage.items, {
            species: staySpecies,
            sizeGroup,
            plannedCheckIn,
            plannedCheckOut,
          })
        : buildSuggestedCageChoices(suggestions, sizeGroup, plannedCheckIn, plannedCheckOut)
      : [];
  const nights = plannedCheckIn && plannedCheckOut ? Math.max(countNights(plannedCheckIn, plannedCheckOut), 0) : 0;
  const cageId = chosenCageId ?? getInitialCageId(choices);
  const isBusy = confirm.isPending || reject.isPending;
  const canConfirm = suggestions !== undefined && canConfirmCage(choices, cageId);

  function handleFailure(caught: unknown) {
    const result = classifyHotelActionError(caught);
    if (result.kind === "stale") {
      showError(result.error);
      return;
    }
    if (result.kind === "message" && result.resetSelection) setChosenCageId(null);
    setFailure(result);
  }

  function submitConfirm() {
    if (isBusy || !canConfirm) return;
    const cageCode = choices.find((choice) => choice.cage.cageId === cageId)?.cage.code ?? null;
    setFailure(null);
    confirm.mutate(
      { appointmentId, request: { cageId } },
      {
        onSuccess: () => {
          showSuccess(getStayAssignedMessage(appointmentId, cageCode));
          onProcessed();
        },
        onError: handleFailure,
      },
    );
  }

  function handleReject() {
    setIsRejecting(false);
    if (isBusy) return;
    setFailure(null);
    reject.mutate(appointmentId, {
      onSuccess: () => {
        showSuccess(getStayRejectedMessage(appointmentId));
        onProcessed();
      },
      onError: handleFailure,
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

  function renderCageArea() {
    if (suggestions === undefined) {
      if (isPending) {
        return (
          <p role="status" aria-busy="true" className="text-muted">
            Đang tải đề xuất chuồng…
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
    if (choices.length === 0) {
      return <p className="text-muted">Chưa có chuồng phù hợp để chọn cho lịch này.</p>;
    }
    return (
      <>
        <CageAssignmentPanel
          species={choices[0].cage.species}
          sizeGroup={sizeGroup}
          nights={nights}
          choices={choices}
          selectedCageId={cageId}
          onSelectedCageIdChange={setChosenCageId}
          hasAlternatives={choices.length > 1}
        />
        {isCagesError && (
          <Alert tone="warn" className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Không tải được danh sách chuồng khác. Vẫn có thể xác nhận chuồng hệ thống đề xuất.</span>
              <Button size="sm" variant="secondary" onClick={() => void refetchCages()}>
                Thử lại
              </Button>
            </div>
          </Alert>
        )}
      </>
    );
  }

  return (
    <>
      <div className="border-t border-line-soft">
        <CardBody>
          {renderCageArea()}
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
          <Button disabled={!canConfirm || isBusy} onClick={submitConfirm}>
            {confirm.isPending ? "Đang xác nhận…" : "Xác nhận lịch lưu trú"}
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
    </>
  );
}
