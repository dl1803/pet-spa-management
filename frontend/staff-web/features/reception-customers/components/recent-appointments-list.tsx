import { StatusBadge } from "@/components/domain/status-badge";
import type { CustomerRecentAppointment } from "@/features/reception-customers/mock-data";

type RecentAppointmentsListProps = {
  customerId: string;
  appointments: CustomerRecentAppointment[];
};

// SW-04 vùng 2: khối “Lịch hẹn gần đây” (phiếu rút gọn, tối đa 5 lịch mới nhất, UI-Screens G-06).
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
          {appointments.map((item) => (
            <li
              key={item.appointmentId}
              className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-3.5 py-3"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="shrink-0 tabular-nums text-center sm:text-left">
                  <span className="block text-sm font-bold text-foreground sm:text-base">{item.timeText}</span>
                  <span className="block text-xs text-muted">{item.dateText}</span>
                </div>
                <div className="h-8 w-px shrink-0 bg-line-soft" aria-hidden="true" />
                <div className="min-w-0">
                  <span className="block font-semibold text-foreground">
                    {item.petName}, {item.type === "Spa" ? "spa" : "lưu trú"}
                  </span>
                  <span className="block truncate text-xs text-muted">{item.servicesSummary}</span>
                </div>
              </div>
              <div className="shrink-0">
                <StatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

