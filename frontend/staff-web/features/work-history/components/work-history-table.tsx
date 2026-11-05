import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { formatDate, formatTimeRange } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { WorkHistoryEntry } from "@/features/work-history/list";

const headerClass = "px-4 py-3 text-left text-xs font-semibold text-muted";

function describeServices(entry: WorkHistoryEntry) {
  const names = (entry.appointment.services ?? []).flatMap((service) => (service.name ? [service.name] : []));
  return names.length > 0 ? names.join(", ") : "—";
}

// SW-12 vùng 2 – Bảng lịch sử công việc (UI-Screens.md).
export function WorkHistoryTable({ entries }: { entries: WorkHistoryEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead className="bg-mist">
          <tr>
            <th scope="col" className={headerClass}>Ngày</th>
            <th scope="col" className={headerClass}>Khung giờ</th>
            <th scope="col" className={headerClass}>Thú cưng</th>
            <th scope="col" className={headerClass}>Dịch vụ</th>
            <th scope="col" className={headerClass}>Trạng thái</th>
            <th scope="col" className={`${headerClass} text-right`}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const { appointment, species } = entry;
            const { appointmentId, petName, slotStart, slotEnd, status } = appointment;
            const name = petName ?? "—";
            return (
              <tr key={appointmentId} className="border-t border-line-soft align-middle hover:bg-[#F8FBFB]">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{slotStart ? formatDate(slotStart) : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                  {slotStart && slotEnd ? formatTimeRange(slotStart, slotEnd) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <PetAvatar species={species} size="sm" />
                    <span className="font-semibold">{name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{describeServices(entry)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <ButtonLink
                    href={ROUTES.appointmentExecution(appointmentId)}
                    variant="ghost"
                    size="sm"
                    aria-label={`Xem lịch của ${name}`}
                  >
                    Xem
                  </ButtonLink>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
