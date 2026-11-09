// features/dashboard/components/occupied-cages.tsx
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Card, CardHeader } from "@/components/ui/card";
import type { OccupiedCage } from "@/features/dashboard/overview";

// MW-02 vùng 5 – Chuồng đang chứa (UI-Screens.md). Chưa có liên kết “Xem tất cả” vì trang Chuồng & giá (MW-07) chưa có.
export function OccupiedCages({ cages }: { cages: OccupiedCage[] }) {
  return (
    <Card>
      <CardHeader title="Chuồng đang chứa" />
      {cages.length === 0 ? (
        <p className="px-5 py-6 text-muted">Hiện không có chuồng nào đang chứa thú cưng.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {cages.map((cage) => (
            <li key={cage.cageId} className="flex items-center gap-3 px-5 py-3">
              <PetAvatar species={cage.species} />
              <div className="min-w-0">
                <div className="font-semibold">{cage.label}</div>
                <div className="text-[13px] text-muted">{cage.returnText}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
