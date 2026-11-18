import { PetAvatar } from "@/components/domain/pet-avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CheckOutData } from "@/features/reception-check-out/check-out";
import { formatTime } from "@/lib/format";
import { ROUTES, withQuery } from "@/lib/routes";

// Danh sách lịch trả hôm nay để chọn khi mở màn mà không kèm appointmentId.
export function ReturnList({ items }: { items: CheckOutData[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon="handover" title="Hôm nay chưa có lịch trả" description="Không có thú cưng lưu trú nào đến hạn trả trong hôm nay." />
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Lịch trả hôm nay" />
      <ul>
        {items.map(({ appointment, pet, cage }) => (
          <li key={appointment.appointmentId} className="flex items-center gap-3 border-b border-line-soft px-5 py-3.5 last:border-b-0 max-[640px]:flex-wrap">
            <PetAvatar species={pet.species} size="md" />
            <div className="min-w-0 grow">
              <div className="font-semibold">{pet.name}</div>
              <div className="break-words text-xs text-muted">
                {`${cage !== null ? `Chuồng ${cage.code}. ` : ""}Chủ: ${appointment.customerName ?? "—"}`}
              </div>
            </div>
            <div className="text-xs text-muted">{`Trả dự kiến ${appointment.plannedCheckOut ? formatTime(appointment.plannedCheckOut) : "—"}`}</div>
            <ButtonLink
              variant="secondary"
              size="sm"
              href={withQuery(ROUTES.checkOut, { appointmentId: appointment.appointmentId })}
              aria-label={`Trả thú cưng ${pet.name}`}
            >
              Chọn
            </ButtonLink>
          </li>
        ))}
      </ul>
    </Card>
  );
}
