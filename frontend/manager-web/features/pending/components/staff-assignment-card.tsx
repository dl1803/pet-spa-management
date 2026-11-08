"use client";

import { useId, useState } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ConfirmSpaRequest, Species, SpaSuggestions } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { getInitialStaffIds, isStaffSelectionComplete } from "../staff-selection";
import type { SpaPendingReason } from "../spa-summary";
import { PendingReasonAlert } from "./pending-reason-alert";
import { SpaInfoGrid } from "./spa-info-grid";
import { StaffAssignmentPanel } from "./staff-assignment-panel";

type StaffAssignmentCardProps = {
  appointmentId: string;
  title: string;
  customerName: string;
  customerPhone: string;
  hasAccount: boolean;
  species: Species;
  serviceNames: string[];
  // ISO 8601.
  slotStart: string;
  slotEnd: string;
  bufferMinutes: number;
  // VND do server tính; web chỉ hiển thị.
  amount: number;
  pendingReason: SpaPendingReason | null;
  suggestions: SpaSuggestions;
  onConfirm: (request: ConfirmSpaRequest) => void;
  onReject: () => void;
};

// MW-04 vùng 3, 4, 5, 6, 7 cho lịch spa và hộp thoại MW-04·D1 (UI-Screens.md). Quản lý xem thông tin lịch, chọn đủ nhân viên
// rồi xác nhận, hoặc từ chối khi cửa hàng không đáp ứng được. Số tiền chỉ hiển thị: backend tính lại khi xác nhận (BR-26);
// trùng lịch, ngoài ca do backend kiểm tra khi xác nhận (UI-Screens G-08).
export function StaffAssignmentCard({
  appointmentId,
  title,
  customerName,
  customerPhone,
  hasAccount,
  species,
  serviceNames,
  slotStart,
  slotEnd,
  bufferMinutes,
  amount,
  pendingReason,
  suggestions,
  onConfirm,
  onReject,
}: StaffAssignmentCardProps) {
  const titleId = `${useId()}-title`;
  const [staffIds, setStaffIds] = useState(() => getInitialStaffIds(suggestions));
  const [isRejecting, setIsRejecting] = useState(false);
  const canConfirm = isStaffSelectionComplete(staffIds, suggestions.staffRequired);

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4 max-[640px]:flex-wrap">
          <PetAvatar species={species} />
          <div className="min-w-0 grow">
            <h2 id={titleId} className="break-words">{title}</h2>
            <p className="text-xs text-muted">
              {formatAppointmentCode(appointmentId)}. {customerName}, {customerPhone}, {hasAccount ? "có tài khoản" : "khách vãng lai"}
            </p>
          </div>
          <Badge tone="st-1">Chờ xác nhận</Badge>
        </div>
        <CardBody>
          {pendingReason && (
            <PendingReasonAlert
              reason={pendingReason}
              amount={amount}
              slotStart={slotStart}
              serviceNames={serviceNames}
              hasAccount={hasAccount}
              className="mb-5"
            />
          )}
          <SpaInfoGrid
            serviceNames={serviceNames}
            slotStart={slotStart}
            slotEnd={slotEnd}
            bufferMinutes={bufferMinutes}
            amount={amount}
            isCustomerChanged={pendingReason?.kind === "CustomerChanged"}
          />
          <StaffAssignmentPanel
            suggestions={suggestions}
            selectedStaffIds={staffIds}
            onSelectedStaffIdsChange={setStaffIds}
          />
        </CardBody>
        <CardFooter>
          <Button variant="danger" onClick={() => setIsRejecting(true)}>
            <Icon name="x-circle" className="size-[18px]" />
            Từ chối: cửa hàng không thể đáp ứng
          </Button>
          <div className="ml-auto">
            <Button disabled={!canConfirm} onClick={() => onConfirm({ staffIds })}>
              Xác nhận lịch hẹn
            </Button>
          </div>
        </CardFooter>
      </Card>

      {isRejecting && (
        <ConfirmDialog
          icon="x-circle"
          tone="danger"
          title="Từ chối lịch hẹn này?"
          description="Dùng khi cửa hàng không có nhân viên hoặc chuồng phù hợp."
          confirmLabel="Từ chối lịch hẹn"
          onConfirm={() => {
            setIsRejecting(false);
            onReject();
          }}
          onCancel={() => setIsRejecting(false)}
        >
          <p>
            Lịch chuyển sang Đã hủy với lý do cửa hàng không thể đáp ứng. Khách có tài khoản nhận thông báo kèm lý do;
            khách vãng lai được lễ tân gọi báo.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
