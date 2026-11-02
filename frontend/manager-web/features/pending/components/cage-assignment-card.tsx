"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Cage, ConfirmHotelRequest, HotelSuggestions, SizeGroup, Species } from "@/lib/api/types";
import { getInitialCageId } from "../cage-selection";
import { CageAssignmentPanel } from "./cage-assignment-panel";

type CageAssignmentCardProps = {
  title: string;
  species: Species;
  sizeGroup: SizeGroup;
  // Số đêm lưu trú của lịch hẹn.
  nights: number;
  suggestions: HotelSuggestions;
  cages: Cage[];
  onConfirm: (request: ConfirmHotelRequest) => void;
  onReject: () => void;
};

// MW-04 vùng 6 và 8 cho lịch lưu trú, hộp thoại MW-04·D1 (UI-Screens.md). Quản lý chọn chuồng rồi xác nhận,
// hoặc từ chối khi cửa hàng không đáp ứng được; chuồng có trống trong các đêm hay không do backend kiểm tra.
export function CageAssignmentCard({ title, species, sizeGroup, nights, suggestions, cages, onConfirm, onReject }: CageAssignmentCardProps) {
  const titleId = `${useId()}-title`;
  const [selectedCageId, setSelectedCageId] = useState(() => getInitialCageId(suggestions));
  const [isRejecting, setIsRejecting] = useState(false);

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <CardBody>
          <h2 id={titleId} className="mb-4">{title}</h2>
          <CageAssignmentPanel
            species={species}
            sizeGroup={sizeGroup}
            nights={nights}
            suggestions={suggestions}
            cages={cages}
            selectedCageId={selectedCageId}
            onSelectedCageIdChange={setSelectedCageId}
          />
        </CardBody>
        <CardFooter>
          <Button variant="danger" onClick={() => setIsRejecting(true)}>
            <Icon name="x-circle" className="size-[18px]" />
            Từ chối: cửa hàng không thể đáp ứng
          </Button>
          <div className="ml-auto">
            <Button onClick={() => onConfirm({ cageId: selectedCageId })}>Xác nhận lịch lưu trú</Button>
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
