"use client";

import { useId, useState } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Cage, ConfirmHotelRequest, HotelSuggestions, SizeGroup, Species } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { buildCageChoices, canConfirmCage, getInitialCageId } from "../cage-selection";
import { getStaySummary } from "../stay-summary";
import { CageAssignmentPanel } from "./cage-assignment-panel";
import { StayInfoGrid } from "./stay-info-grid";

type CageAssignmentCardProps = {
  appointmentId: string;
  title: string;
  customerName: string;
  customerPhone: string;
  hasAccount: boolean;
  species: Species;
  sizeGroup: SizeGroup;
  // ISO 8601.
  plannedCheckIn: string;
  plannedCheckOut: string;
  pricePerNight: number;
  foodPerNight: number;
  suggestions: HotelSuggestions;
  cages: Cage[];
  onConfirm: (request: ConfirmHotelRequest) => void;
  onReject: () => void;
};

// MW-04 vùng 3, 4, 6 và 8 cho lịch lưu trú, hộp thoại MW-04·D1 (UI-Screens.md). Quản lý xem thông tin lịch, chọn chuồng
// rồi xác nhận, hoặc từ chối khi cửa hàng không đáp ứng được; chuồng không trùng đêm do backend kiểm tra.
export function CageAssignmentCard({
  appointmentId,
  title,
  customerName,
  customerPhone,
  hasAccount,
  species,
  sizeGroup,
  plannedCheckIn,
  plannedCheckOut,
  pricePerNight,
  foodPerNight,
  suggestions,
  cages,
  onConfirm,
  onReject,
}: CageAssignmentCardProps) {
  const titleId = `${useId()}-title`;
  const choices = buildCageChoices(suggestions, cages, { species, sizeGroup, plannedCheckIn, plannedCheckOut });
  const summary = getStaySummary(plannedCheckIn, plannedCheckOut, pricePerNight, foodPerNight);
  const [selectedCageId, setSelectedCageId] = useState(() => getInitialCageId(choices));
  const [isRejecting, setIsRejecting] = useState(false);
  const canConfirm = canConfirmCage(choices, selectedCageId);

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
          <StayInfoGrid plannedCheckIn={plannedCheckIn} plannedCheckOut={plannedCheckOut} summary={summary} />
          <CageAssignmentPanel
            species={species}
            sizeGroup={sizeGroup}
            nights={summary.nights}
            choices={choices}
            selectedCageId={selectedCageId}
            onSelectedCageIdChange={setSelectedCageId}
          />
        </CardBody>
        <CardFooter>
          <Button variant="danger" onClick={() => setIsRejecting(true)}>
            <Icon name="x-circle" className="size-[18px]" />
            Từ chối: cửa hàng không thể đáp ứng
          </Button>
          <div className="ml-auto flex items-center gap-3 max-[640px]:flex-wrap">
            {!canConfirm && <p className="text-xs text-muted">Chưa có chuồng phù hợp để chọn.</p>}
            <Button disabled={!canConfirm} onClick={() => onConfirm({ cageId: selectedCageId })}>
              Xác nhận lịch lưu trú
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
