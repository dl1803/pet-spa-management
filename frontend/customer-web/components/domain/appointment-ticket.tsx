import { AppointmentTypeLabel } from "@/components/domain/appointment-type-label";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { StatusBadge } from "@/components/domain/status-badge";
import { Icon } from "@/components/icons";
import type { Appointment, Species } from "@/lib/api/types";
import { getAppointmentStart } from "@/lib/appointments";
import { formatAppointmentCode, formatDate, formatShortDate, formatTime } from "@/lib/format";
import { getStoreDateKey } from "@/lib/time";

type StubTone = "spa" | "hotel" | "cancel";

const STUB_CLASS: Record<StubTone, { box: string; time: string }> = {
  spa: { box: "bg-lagoon-25", time: "text-lagoon-700" },
  hotel: { box: "bg-[#F1EFFC]", time: "text-[#4A3FA6]" },
  cancel: { box: "bg-[#F7F0EF]", time: "text-muted line-through decoration-1" },
};

function getStubTone(appointment: Appointment): StubTone {
  if (appointment.status === "Cancelled") return "cancel";
  return appointment.type === "Hotel" ? "hotel" : "spa";
}

function getStubText(appointment: Appointment, todayKey: string) {
  const start = getAppointmentStart(appointment);
  if (!start) return { time: "—", date: "" };
  if (appointment.type === "Hotel") {
    const end = appointment.plannedCheckOut;
    return { time: formatShortDate(start), date: end ? `đến ${formatShortDate(end)}` : "" };
  }
  return {
    time: formatTime(start),
    date: getStoreDateKey(start) === todayKey ? `Hôm nay, ${formatShortDate(start)}` : formatDate(start),
  };
}

type AppointmentTicketProps = {
  appointment: Appointment;
  petName: string;
  species: Species | null;
  description: string;
  todayKey: string;
};

export function AppointmentTicket({ appointment, petName, species, description, todayKey }: AppointmentTicketProps) {
  const tone = getStubTone(appointment);
  const stub = getStubText(appointment, todayKey);

  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-line bg-white max-sm:grid-cols-[84px_minmax(0,1fr)]">
      <div
        className={`relative flex flex-col items-center justify-center border-r-[1.5px] border-dashed border-line px-3 py-3.5 text-center before:absolute before:-right-2 before:-top-[9px] before:size-[15px] before:rounded-full before:border before:border-line before:bg-white before:content-[''] after:absolute after:-bottom-[9px] after:-right-2 after:size-[15px] after:rounded-full after:border after:border-line after:bg-white after:content-[''] ${STUB_CLASS[tone].box}`}
      >
        <span className={`text-xl font-bold leading-6 tabular-nums ${STUB_CLASS[tone].time}`}>{stub.time}</span>
        {stub.date && <span className="mt-0.5 text-xs leading-4 text-muted">{stub.date}</span>}
      </div>
      <div className="flex min-w-0 items-center gap-3.5 px-[18px] py-3.5">
        {species ? (
          <PetAvatar species={species} />
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-line-soft text-muted">
            <Icon name="paw" className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-semibold">
            <span>{petName}</span>
            <AppointmentTypeLabel type={appointment.type} />
          </div>
          {description && <div className="mt-0.5 text-[13px] leading-5 text-muted">{description}</div>}
        </div>
      </div>
      <div className="flex flex-col items-end justify-center gap-2 px-[18px] py-3.5 max-sm:col-span-full max-sm:flex-row max-sm:items-center max-sm:justify-start max-sm:border-t max-sm:border-line-soft">
        <StatusBadge status={appointment.status} />
        <span className="text-xs text-muted">{formatAppointmentCode(appointment.appointmentId)}</span>
      </div>
    </div>
  );
}

