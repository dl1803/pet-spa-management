import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { CheckInData } from "@/features/reception-check-in/check-in";
import { formatKg } from "@/features/reception-check-in/weight";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

function Tile({ label, value, note }: { label: string; value: ReactNode; note?: string | null }) {
  return (
    <div className="min-w-0 rounded-xl bg-mist px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="break-words font-semibold">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}

type CheckInSummaryProps = {
  data: CheckInData;
  weightLabel: string;
};

export function CheckInSummary({ data, weightLabel }: CheckInSummaryProps) {
  const { appointment, pet } = data;
  const customerName = appointment.customerName ?? "—";

  if (appointment.type === "Hotel") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-mist px-4 py-3">
        <Icon name="user" className="size-[18px] text-muted" />
        <div className="min-w-0 grow break-words font-semibold">{customerName}</div>
      </div>
    );
  }

  const serviceNames = (appointment.services ?? []).map((service) => service.name).filter((name) => name !== undefined);
  return (
    <div className="grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
      <Tile label="Khách hàng" value={customerName} />
      <Tile
        label={weightLabel}
        value={`${formatKg(pet.weightKg)}, nhóm ${SIZE_GROUP_LABELS[appointment.sizeGroup]}`}
        note={pet.heightCm != null ? `Chiều cao ${pet.heightCm} cm giữ theo hồ sơ` : null}
      />
      <Tile label="Dịch vụ" value={serviceNames.length > 0 ? serviceNames.join(", ") : "—"} />
    </div>
  );
}

