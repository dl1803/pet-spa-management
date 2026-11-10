import { StatusBadge } from "@/components/domain/status-badge";
import type { CustomerRecentAppointment } from "@/features/reception-customers/mock-data";
import { formatShortDate, formatTime } from "@/lib/format";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";

type RecentAppointmentsListProps = {
  customerId: string;
  appointments: CustomerRecentAppointment[];
};

function getStubInfo(item: CustomerRecentAppointment) {
  const start = item.slotStart ?? item.plannedCheckIn;
  if (!start) return { time: "—", date: "" };
  if (item.type === "Hotel") {
    const end = item.plannedCheckOut;
    return {
      time: formatShortDate(start),
      date: end ? `đến ${formatShortDate(end)}` : "",
    };
  }
  return {
    time: formatTime(start),
    date: formatShortDate(start),
  };
}

function getStubTone(item: CustomerRecentAppointment) {
  if (item.status === "Cancelled") {
    return { box: "bg-[#F7F0EF]", time: "text-muted line-through" };
  }
  if (item.type === "Hotel") {
    return { box: "bg-[#F1EFFC]", time: "text-[#4A3FA6]" };
  }
  return { box: "bg-lagoon-25", time: "text-lagoon-700" };
}

// SW-04 vùng 2: khối “Lịch hẹn gần đây” (phiếu rút gọn, tối đa 5 lịch mới nhất, UI-Screens G-06, Design-System §4.3).
export function RecentAppointmentsList({ customerId, appointments }: RecentAppointmentsListProps) {
  return (
    <section aria-labelledby={`recent-appts-${customerId}`} className="mt-5">
      <h3 id={`recent-appts-${customerId}`} className="mb-2.5">
        Lịch hẹn gần đây
      </h3>
      {appointments.length === 0 ? (
        <p className="text-muted">Chưa có lịch hẹn nào gần đây.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {appointments.map((item) => {
            const stub = getStubInfo(item);
            const tone = getStubTone(item);
            const typeLabel = APPOINTMENT_TYPE_LABELS[item.type].toLocaleLowerCase("vi-VN");

            return (
              <li
                key={item.appointmentId}
                className="flex flex-wrap items-center justify-between overflow-hidden rounded-xl border border-line bg-white transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={`flex shrink-0 flex-col items-center justify-center border-r border-line-soft px-3.5 py-2.5 text-center tabular-nums max-[640px]:px-2.5 ${tone.box}`}
                  >
                    <span className={`block text-base font-bold leading-5 max-[640px]:text-sm ${tone.time}`}>
                      {stub.time}
                    </span>
                    {stub.date && <span className="block text-xs leading-4 text-muted">{stub.date}</span>}
                  </div>
                  <div className="min-w-0 flex-1 py-1 pr-2">
                    <span className="block truncate font-semibold text-ink">
                      {item.petName}, {typeLabel}
                    </span>
                    {item.servicesSummary && (
                      <span className="block truncate text-xs text-muted">{item.servicesSummary}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 px-3.5 py-2 max-[640px]:w-full max-[640px]:border-t max-[640px]:border-line-soft max-[640px]:pt-2 max-[640px]:pb-2.5">
                  <StatusBadge status={item.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
