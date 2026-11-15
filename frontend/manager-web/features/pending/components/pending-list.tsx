import { Icon } from "@/components/icons";
import type { Appointment } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";
import { getListStamp } from "../list";

type PendingListProps = {
  // Đã lọc theo loại và sắp theo giờ hẹn.
  appointments: Appointment[];
  selectedId: string | null;
  onSelect: (appointmentId: string) => void;
};

// MW-04 vùng 2 – danh sách lịch chờ xác nhận. Danh sách chỉ có tên thú cưng, mã, loại và giờ hẹn; loài và hồ sơ chi tiết
// nằm ở thẻ bên phải (GET /pets/{petId}), không gọi API cho từng dòng.
export function PendingList({ appointments, selectedId, onSelect }: PendingListProps) {
  return (
    <ul aria-label="Danh sách lịch chờ xác nhận" className="flex flex-col gap-2.5">
      {appointments.map((appointment) => {
        const isSelected = appointment.appointmentId === selectedId;
        const stamp = getListStamp(appointment);
        return (
          <li key={appointment.appointmentId}>
            <button
              type="button"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(appointment.appointmentId)}
              className={`grid w-full cursor-pointer grid-cols-[72px_auto_1fr] items-center gap-3 rounded-2xl border bg-white py-3 pl-3 pr-4 text-left ${
                isSelected ? "border-lagoon shadow-[inset_0_0_0_1px_var(--color-lagoon)]" : "border-line hover:border-lagoon/50"
              }`}
            >
              <span className="tabular-nums">
                <b className="block text-[17px] leading-6">{stamp.primary}</b>
                <small className="text-xs text-muted">{stamp.secondary}</small>
              </span>
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-mist text-lagoon">
                <Icon name={appointment.type === "Spa" ? "droplet" : "bed"} className="size-5" />
              </span>
              <span className="min-w-0">
                <b className="block break-words">{appointment.petName ?? "Thú cưng"}</b>
                <small className="text-xs text-muted">
                  {APPOINTMENT_TYPE_LABELS[appointment.type]}. {formatAppointmentCode(appointment.appointmentId)}
                </small>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
