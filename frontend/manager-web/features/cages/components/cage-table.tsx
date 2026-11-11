import { PetAvatar } from "@/components/domain/pet-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tag } from "@/components/ui/tag";
import type { Cage } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { CAGE_STATUS_LABELS, describeOccupant, getCageStatus, type CageStatus } from "../list";

type CageTableProps = {
  cages: Cage[];
  // Thời điểm hiện tại (ISO 8601) để hiện “hôm nay” ở hạn trả; truyền từ ngoài, không đọc đồng hồ khi render.
  now: string;
  onAdd: () => void;
  onEdit: (cage: Cage) => void;
  onStop: (cage: Cage) => void;
  onReopen: (cage: Cage) => void;
};

const headerClass = "px-4 py-3 text-left text-xs font-semibold text-muted";

const STATUS_TONE = { Empty: "ok", Occupied: "busy", Inactive: "default" } as const satisfies Record<CageStatus, "ok" | "busy" | "default">;

// MW-07 vùng 4 – Bảng chuồng (UI-Screens.md). “Ngừng sử dụng” chỉ có ở chuồng đang sử dụng và trống; chuồng đang chứa chỉ có “Sửa”.
export function CageTable({ cages, now, onAdd, onEdit, onStop, onReopen }: CageTableProps) {
  if (cages.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="grid"
          title="Chưa có chuồng nào"
          description="Thêm chuồng đầu tiên để cửa hàng nhận lịch lưu trú."
          action={<Button variant="secondary" onClick={onAdd}>Thêm chuồng</Button>}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <caption className="sr-only">Danh sách chuồng lưu trú</caption>
          <thead className="bg-mist">
            <tr>
              <th scope="col" className={headerClass}>Mã</th>
              <th scope="col" className={headerClass}>Loài</th>
              <th scope="col" className={headerClass}>Nhóm</th>
              <th scope="col" className={headerClass}>Tình trạng</th>
              <th scope="col" className={headerClass}>Đang chứa</th>
              <th scope="col" className={`${headerClass} text-right`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {cages.map((cage) => {
              const status = getCageStatus(cage);
              return (
                <tr key={cage.cageId} className={`border-t border-line-soft align-middle ${cage.isActive ? "" : "opacity-70"}`}>
                  <td className="px-4 py-3.5 font-semibold">{cage.code}</td>
                  <td className="px-4 py-3.5">{SPECIES_LABELS[cage.species]}</td>
                  <td className="px-4 py-3.5">{SIZE_GROUP_LABELS[cage.sizeGroup]}</td>
                  <td className="px-4 py-3.5">
                    <Tag tone={STATUS_TONE[status]}>{CAGE_STATUS_LABELS[status]}</Tag>
                  </td>
                  <td className="px-4 py-3.5">
                    {cage.occupant ? (
                      <div className="flex items-center gap-3">
                        <PetAvatar species={cage.species} size="sm" />
                        <div className="min-w-0">
                          <div className="font-semibold">{cage.occupant.petName}</div>
                          <div className="text-xs text-muted">{describeOccupant(cage.occupant, now)}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" aria-label={`Sửa chuồng ${cage.code}`} onClick={() => onEdit(cage)}>
                        Sửa
                      </Button>
                      {!cage.isActive && (
                        <Button variant="ghost" size="sm" aria-label={`Mở lại chuồng ${cage.code}`} onClick={() => onReopen(cage)}>
                          Mở lại
                        </Button>
                      )}
                      {cage.isActive && !cage.occupant && (
                        <Button variant="ghost" size="sm" aria-label={`Ngừng sử dụng chuồng ${cage.code}`} onClick={() => onStop(cage)}>
                          Ngừng sử dụng
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
