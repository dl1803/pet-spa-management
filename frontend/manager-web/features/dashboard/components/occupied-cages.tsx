// features/dashboard/components/occupied-cages.tsx
import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Card, CardHeader } from "@/components/ui/card";
import type { OccupiedCage } from "@/features/dashboard/overview";
import { ROUTES } from "@/lib/routes";

// MW-02 vùng 5 – Chuồng đang chứa (UI-Screens.md). Liên kết “Xem tất cả” dẫn tới MW-07 (/chuong-va-gia).
export function OccupiedCages({ cages }: { cages: OccupiedCage[] }) {
  return (
    <Card>
      <CardHeader title="Chuồng đang chứa">
        <Link
          href={ROUTES.cages}
          className="text-[13px] font-semibold text-lagoon-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon"
        >
          Xem tất cả
        </Link>
      </CardHeader>
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
