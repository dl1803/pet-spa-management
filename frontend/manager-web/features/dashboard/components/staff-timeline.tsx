// features/dashboard/components/staff-timeline.tsx
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  buildTimelineRows,
  getNowOffset,
  TIMELINE_END_HOUR,
  TIMELINE_HOUR_LABELS,
  TIMELINE_START_HOUR,
  type DashboardSnapshot,
  type TimelineBlock,
  type TrackedSpaStatus,
} from "@/features/dashboard/overview";
import { formatAppointmentCode, formatTime, formatTimeRange } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";

const BLOCK_CLASS: Record<TrackedSpaStatus, string> = {
  Pending: "border border-dashed border-st-pending/60 bg-st-pending-bg text-st-pending",
  Confirmed: "bg-st-confirmed-bg text-st-confirmed",
  Received: "bg-st-received-bg text-st-received",
  InProgress: "bg-st-active-bg text-st-active",
};

const HOUR_COUNT = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
const GRID_STYLE = {
  backgroundImage: "linear-gradient(to right, var(--color-line-soft) 1px, transparent 1px)",
  backgroundSize: `${100 / HOUR_COUNT}% 100%`,
};
const SHIFT_STYLE = {
  backgroundImage: "repeating-linear-gradient(135deg, var(--color-lagoon-50) 0 6px, var(--color-lagoon-25) 6px 12px)",
};
const BUFFER_STYLE = {
  backgroundImage: "repeating-linear-gradient(90deg, var(--color-line) 0 2px, transparent 2px 5px)",
};

function Block({ block }: { block: TimelineBlock }) {
  const statusLabel = APPOINTMENT_STATUS_LABELS[block.status];
  const summary = `${block.petName}, ${statusLabel}, ${formatTimeRange(block.slotStart, block.slotEnd)}`;

  return (
    <>
      {block.buffer && (
        <span
          aria-hidden="true"
          data-buffer
          className="absolute inset-y-2.5 rounded-r-lg opacity-80"
          style={{ left: `${block.buffer.left}%`, width: `${block.buffer.width}%`, ...BUFFER_STYLE }}
        />
      )}
      <Link
        href={ROUTES.appointmentDetail(block.appointmentId)}
        aria-label={`${summary}. Mở chi tiết ${formatAppointmentCode(block.appointmentId)}`}
        title={summary}
        data-status={block.status}
        className={`absolute inset-y-2.5 overflow-hidden rounded-lg px-2 py-1 text-xs leading-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lagoon ${BLOCK_CLASS[block.status]}`}
        style={{ left: `${block.span.left}%`, width: `${block.span.width}%` }}
      >
        <span className="block truncate font-semibold">{block.petName}</span>
        <span className="block truncate text-[11px]">{statusLabel}</span>
      </Link>
    </>
  );
}

// MW-02 vùng 3 – Tiến độ spa theo nhân viên (UI-Screens.md): khung 08:00 – 21:00, nền sọc là ca làm, vạch nét đứt sau khối là
// thời gian dọn dẹp, vạch dọc là giờ hiện tại và phần trước đó được tô mờ. Chỉ xem; bấm một khối để mở chi tiết lịch (MW-05).
export function StaffTimeline({ snapshot }: { snapshot: DashboardSnapshot }) {
  const rows = buildTimelineRows(snapshot);
  const nowOffset = getNowOffset(snapshot.now);

  return (
    <Card>
      <CardHeader title="Tiến độ spa theo nhân viên">
        <span className="text-[13px] text-muted">
          {String(TIMELINE_START_HOUR).padStart(2, "0")}:00 - {TIMELINE_END_HOUR}:00
        </span>
      </CardHeader>
      <CardBody>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[112px_1fr]">
              <div />
              <div className="relative h-12" aria-hidden="true">
                {TIMELINE_HOUR_LABELS.map((label, index) => (
                  <span
                    key={label}
                    className="absolute top-0 -translate-x-1/2 text-xs tabular-nums text-muted"
                    style={{ left: `${(index / HOUR_COUNT) * 100}%` }}
                  >
                    {label}
                  </span>
                ))}
                {nowOffset !== null && (
                  <span
                    className="absolute top-6 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
                    style={{ left: `${nowOffset}%` }}
                  >
                    {formatTime(snapshot.now)}
                  </span>
                )}
              </div>
            </div>
            <ul aria-label="Tiến độ spa theo nhân viên">
              {rows.map((row) => (
                <li key={row.staffId ?? "unassigned"} className="grid grid-cols-[112px_1fr] border-t border-line-soft">
                  <div className="flex items-center gap-2 pr-2">
                    {row.fullName ? (
                      <>
                        <Avatar name={row.fullName} tone="teal" />
                        <span className="font-semibold">{row.label}</span>
                      </>
                    ) : (
                      <span className="text-[13px] text-muted">{row.label}</span>
                    )}
                  </div>
                  <div className="relative h-14 border-l border-line-soft" style={GRID_STYLE}>
                    {row.shifts.map((shift) => (
                      <span
                        key={`${shift.left}-${shift.width}`}
                        aria-hidden="true"
                        data-shift
                        className="absolute inset-y-1.5 rounded-lg"
                        style={{ left: `${shift.left}%`, width: `${shift.width}%`, ...SHIFT_STYLE }}
                      />
                    ))}
                    {nowOffset !== null && (
                      <span aria-hidden="true" data-past className="pointer-events-none absolute inset-y-0 left-0 bg-mist/60" style={{ width: `${nowOffset}%` }} />
                    )}
                    {row.blocks.map((block) => (
                      <Block key={block.appointmentId} block={block} />
                    ))}
                    {nowOffset !== null && (
                      <span aria-hidden="true" data-now className="pointer-events-none absolute inset-y-0 w-px bg-ink" style={{ left: `${nowOffset}%` }} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3.5 rounded" style={SHIFT_STYLE} />
            Ca làm
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3.5 w-4 rounded-sm" style={BUFFER_STYLE} />
            Dọn dẹp {snapshot.bufferMinutes} phút
          </span>
          {nowOffset !== null && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-3.5 w-px bg-ink" />
              Hiện tại, {formatTime(snapshot.now)}
            </span>
          )}
          <Badge tone="st-2">{APPOINTMENT_STATUS_LABELS.Confirmed}</Badge>
          <Badge tone="st-3">{APPOINTMENT_STATUS_LABELS.Received}</Badge>
          <Badge tone="st-4">{APPOINTMENT_STATUS_LABELS.InProgress}</Badge>
          <Badge tone="st-1">{APPOINTMENT_STATUS_LABELS.Pending}</Badge>
        </div>
      </CardBody>
    </Card>
  );
}
