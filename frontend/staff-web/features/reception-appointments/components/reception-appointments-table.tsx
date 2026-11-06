import { AppointmentTypeLabel } from "@/components/domain/appointment-type-label";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { getHotelEvent, getRowTime, type ReceptionAppointmentRow } from "@/features/reception-appointments/list";
import { formatTime } from "@/lib/format";
import { SPECIES_LABELS } from "@/lib/labels";
import { ROUTES, withQuery } from "@/lib/routes";
import { countNights } from "@/lib/time";

const headerClass = "px-4 py-3 text-left text-xs font-semibold text-muted";
const HOTEL_EVENT_LABELS = { checkIn: "nhận", checkOut: "trả" } as const;

// Nhân viên (spa) hoặc chuồng (lưu trú). Chưa có thì: lịch Chờ xác nhận hiện "Chờ quản lý xếp", còn lại "—".
function Assignee({ row }: { row: ReceptionAppointmentRow }) {
  const { appointment, cageCode } = row;
  const names =
    appointment.type === "Hotel"
      ? cageCode
        ? [`Chuồng ${cageCode}`]
        : []
      : (appointment.staff ?? []).flatMap((member) => (member.fullName ? [member.fullName] : []));
  if (names.length > 0) return <>{names.join(", ")}</>;
  if (appointment.status === "Pending") return <span className="text-muted">Chờ quản lý xếp</span>;
  return <>—</>;
}

// Bảng lịch hẹn toàn cửa hàng của lễ tân.
export function ReceptionAppointmentsTable({ rows, dateKey }: { rows: ReceptionAppointmentRow[]; dateKey: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse">
        <thead className="bg-mist">
          <tr>
            <th scope="col" className={headerClass}>Giờ</th>
            <th scope="col" className={headerClass}>Thú cưng</th>
            <th scope="col" className={headerClass}>Khách hàng</th>
            <th scope="col" className={headerClass}>Loại</th>
            <th scope="col" className={headerClass}>Nhân viên / chuồng</th>
            <th scope="col" className={headerClass}>Trạng thái</th>
            <th scope="col" className={`${headerClass} text-right`}>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { appointment, species, breed } = row;
            const { appointmentId, type, status, petName, customerName, plannedCheckIn, plannedCheckOut } = appointment;
            const name = petName ?? "—";
            const time = getRowTime(appointment, dateKey);
            const event = getHotelEvent(appointment, dateKey);
            const nights = type === "Hotel" && plannedCheckIn && plannedCheckOut ? countNights(plannedCheckIn, plannedCheckOut) : undefined;
            const canCheckIn = type === "Spa" && status === "Confirmed";
            return (
              <tr key={appointmentId} className="border-t border-line-soft align-middle hover:bg-[#F8FBFB]">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                  <span className="font-semibold">{time ? formatTime(time) : "—"}</span>
                  {event && <span className="block text-xs text-muted">{HOTEL_EVENT_LABELS[event]}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <PetAvatar species={species} size="sm" />
                    <div>
                      <span className="block font-semibold">{name}</span>
                      <span className="block text-xs text-muted">{`${SPECIES_LABELS[species]} ${breed}`}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{customerName ?? "—"}</td>
                <td className="px-4 py-3">
                  <AppointmentTypeLabel type={type} nights={nights} />
                </td>
                <td className="px-4 py-3">
                  <Assignee row={row} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {canCheckIn && (
                    <ButtonLink
                      href={withQuery(ROUTES.checkIn, { appointmentId })}
                      variant="secondary"
                      size="sm"
                      aria-label={`Tiếp nhận ${name}`}
                    >
                      Tiếp nhận
                    </ButtonLink>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

