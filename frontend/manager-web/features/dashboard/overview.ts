// features/dashboard/overview.ts
import type { AppointmentDetail, AppointmentStatus, Cage, Payment, PaymentKind, Staff, WorkShift } from "@/lib/api/types";
import { formatAppointmentCode, formatDate, formatMoney, formatShortDate, formatTime, formatWeekday, lowerFirst } from "@/lib/format";
import { PAYMENT_KIND_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

// Dữ liệu một lần tải của MW-02. Mỗi trường là kết quả của một lời gọi API ghi ở UI-Screens MW-02, nhưng cách gọi chưa chốt
// vì chưa nối backend; tại đây chỉ là dữ liệu mô phỏng, nên màn hình chỉ phụ thuộc hình dạng này.
export type DashboardSnapshot = {
  // Thời điểm tải dữ liệu gần nhất (ISO 8601); mọi “hôm nay”, “hiện tại” đều tính từ đây, không đọc đồng hồ máy.
  now: string;
  // Booking.BufferMinutes từ GET /config.
  bufferMinutes: number;
  // GET /staff.
  staff: Staff[];
  // GET /work-shifts trong ngày.
  shifts: WorkShift[];
  // GET /appointments?status=Pending&type=…&pageSize=1 → total.
  pendingCounts: { spa: number; hotel: number };
  // Lịch spa trong ngày kèm staff[] (GET /appointments?type=Spa&date=… rồi GET /appointments/{id}, UI-Screens G-05).
  spaToday: AppointmentDetail[];
  // Lịch lưu trú liên quan hôm nay: Confirmed nhận hôm nay, InStay trả hôm nay.
  hotelAppointments: AppointmentDetail[];
  // GET /cages.
  cages: Cage[];
  // GET /payments?status=Unpaid.
  unpaidPayments: Payment[];
};

// Khung giờ của biểu đồ tiến độ: 08:00 – 21:00 (UI-Screens MW-02 vùng 3).
export const TIMELINE_START_HOUR = 8;
export const TIMELINE_END_HOUR = 21;
const TIMELINE_START_MINUTE = TIMELINE_START_HOUR * 60;
const TIMELINE_SPAN_MINUTES = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;

// Nhãn giờ trên trục: 08 … 20 (mốc 21 là mép phải của biểu đồ).
export const TIMELINE_HOUR_LABELS: string[] = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
  (_, index) => String(TIMELINE_START_HOUR + index).padStart(2, "0"),
);

// Chỉ 4 trạng thái này được tính và vẽ trên tổng quan (UI-Screens MW-02: màu st-1 … st-4); lịch đã xong hoặc đã hủy không hiện.
export const TRACKED_SPA_STATUSES = ["Pending", "Confirmed", "Received", "InProgress"] as const satisfies readonly AppointmentStatus[];
export type TrackedSpaStatus = (typeof TRACKED_SPA_STATUSES)[number];

export function isTrackedSpa(appointment: AppointmentDetail): appointment is AppointmentDetail & { status: TrackedSpaStatus } {
  return appointment.type === "Spa" && (TRACKED_SPA_STATUSES as readonly AppointmentStatus[]).includes(appointment.status);
}

// Phút trong ngày theo múi giờ cửa hàng.
function minuteOfDay(value: string): number {
  const [hour, minute] = formatTime(value).split(":").map(Number);
  return hour * 60 + minute;
}

export type TimelineSpan = { left: number; width: number };

// Vị trí đoạn [start, end] trên biểu đồ, tính theo % chiều rộng và cắt theo khung 08:00 – 21:00; ngoài khung → null.
export function toTimelineSpan(start: string, end: string): TimelineSpan | null {
  const from = Math.max(minuteOfDay(start), TIMELINE_START_MINUTE);
  const to = Math.min(minuteOfDay(end), TIMELINE_START_MINUTE + TIMELINE_SPAN_MINUTES);
  if (to <= from) return null;
  return {
    left: ((from - TIMELINE_START_MINUTE) / TIMELINE_SPAN_MINUTES) * 100,
    width: ((to - from) / TIMELINE_SPAN_MINUTES) * 100,
  };
}

// Vạch “hiện tại”: % chiều rộng; ngoài khung giờ biểu đồ → null (không vẽ vạch và không tô mờ).
export function getNowOffset(now: string): number | null {
  const minute = minuteOfDay(now);
  if (minute < TIMELINE_START_MINUTE || minute > TIMELINE_START_MINUTE + TIMELINE_SPAN_MINUTES) return null;
  return ((minute - TIMELINE_START_MINUTE) / TIMELINE_SPAN_MINUTES) * 100;
}

export type TimelineBlock = {
  appointmentId: string;
  petName: string;
  status: TrackedSpaStatus;
  slotStart: string;
  slotEnd: string;
  span: TimelineSpan;
  // Vạch nét đứt sau khối = thời gian dọn dẹp; bị cắt ở mép phải của biểu đồ.
  buffer: TimelineSpan | null;
};

export type TimelineRow = {
  // null = hàng “Chưa phân công”.
  staffId: string | null;
  label: string;
  fullName: string | null;
  shifts: TimelineSpan[];
  blocks: TimelineBlock[];
};

// Tên gọi ngắn trên hàng: từ cuối của họ tên, như UI demo (“Nguyễn Thị Hạnh” → “Hạnh”).
export function getShortName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return words[words.length - 1] ?? "";
}

function toBlock(appointment: AppointmentDetail & { status: TrackedSpaStatus }, bufferMinutes: number): TimelineBlock | null {
  if (!appointment.slotStart || !appointment.slotEnd) return null;
  const span = toTimelineSpan(appointment.slotStart, appointment.slotEnd);
  if (!span) return null;
  const bufferEnd = new Date(Date.parse(appointment.slotEnd) + bufferMinutes * 60_000).toISOString();
  return {
    appointmentId: appointment.appointmentId,
    petName: appointment.petName ?? "Thú cưng",
    status: appointment.status,
    slotStart: appointment.slotStart,
    slotEnd: appointment.slotEnd,
    span,
    buffer: toTimelineSpan(appointment.slotEnd, bufferEnd),
  };
}

// MW-02 vùng 3: mỗi nhân viên spa đang hoạt động một hàng (ca làm + lịch được phân công), cuối cùng là hàng “Chưa phân công”.
// Lịch spa có 2 nhân viên hiện ở cả 2 hàng. Lịch Pending (chưa có nhân viên) và mọi lịch không có nhân viên nào đang hoạt động
// trong danh sách hiện ở hàng “Chưa phân công”.
export function buildTimelineRows(snapshot: DashboardSnapshot): TimelineRow[] {
  const tracked = snapshot.spaToday.filter(isTrackedSpa);
  const spaStaff = snapshot.staff.filter((member) => member.staffRole === "SpaStaff" && member.isActive);
  const rowStaffIds = new Set(spaStaff.map((member) => member.staffId));

  const rows: TimelineRow[] = spaStaff.map((member) => ({
    staffId: member.staffId,
    label: getShortName(member.fullName),
    fullName: member.fullName,
    shifts: snapshot.shifts
      .filter((shift) => shift.staffId === member.staffId)
      .map((shift) => toTimelineSpan(shift.shiftStart, shift.shiftEnd))
      .filter((span): span is TimelineSpan => span !== null),
    blocks: tracked
      .filter((appointment) => appointment.staff?.some((item) => item.staffId === member.staffId))
      .map((appointment) => toBlock(appointment, snapshot.bufferMinutes))
      .filter((block): block is TimelineBlock => block !== null),
  }));

  const unassigned = tracked
    .filter((appointment) => !appointment.staff?.some((item) => rowStaffIds.has(item.staffId)))
    .map((appointment) => toBlock(appointment, snapshot.bufferMinutes))
    .filter((block): block is TimelineBlock => block !== null);

  return [...rows, { staffId: null, label: "Chưa phân công", fullName: null, shifts: [], blocks: unassigned }];
}

export type KpiSummary = {
  pending: { total: number; caption: string };
  spaToday: { total: number; caption: string };
  cages: { occupied: number; active: number; caption: string };
  unpaid: { count: number; total: number; caption: string };
};

function countByStatus(appointments: AppointmentDetail[], status: AppointmentStatus) {
  return appointments.filter((appointment) => appointment.status === status).length;
}

function isOnStoreDay(value: string | null | undefined, dayKey: string) {
  return Boolean(value) && getStoreDateKey(value as string) === dayKey;
}

// “đều là tiền lưu trú” khi mọi khoản cùng loại (UI demo); lẫn nhiều loại thì chỉ hiện tổng tiền.
function describeUnpaid(payments: Payment[], total: number): string {
  if (payments.length === 0) return "Không có khoản nào chưa thanh toán.";
  const kinds = new Set<PaymentKind>(payments.map((payment) => payment.kind));
  const money = formatMoney(total);
  if (kinds.size !== 1) return money;
  return `${money}, đều là ${lowerFirst(PAYMENT_KIND_LABELS[[...kinds][0]])}`;
}

// MW-02 vùng 2: 4 thẻ số liệu. Mọi con số là đếm hoặc cộng dữ liệu server trả; số tiền cộng đúng `amount`, không tính lại.
export function summarizeKpis(snapshot: DashboardSnapshot): KpiSummary {
  const dayKey = getStoreDateKey(snapshot.now);
  const tracked = snapshot.spaToday.filter(isTrackedSpa);
  const pendingTotal = snapshot.pendingCounts.spa + snapshot.pendingCounts.hotel;
  const occupied = snapshot.cages.filter((cage) => cage.occupant);
  const checkInsToday = snapshot.hotelAppointments.filter(
    (appointment) => appointment.status === "Confirmed" && isOnStoreDay(appointment.plannedCheckIn, dayKey),
  ).length;
  const checkOutsToday = snapshot.hotelAppointments.filter(
    (appointment) => appointment.status === "InStay" && isOnStoreDay(appointment.plannedCheckOut, dayKey),
  ).length;
  const unpaidTotal = snapshot.unpaidPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    pending: {
      total: pendingTotal,
      caption: pendingTotal === 0
        ? "Không có lịch chờ xác nhận."
        : `Spa ${snapshot.pendingCounts.spa}, lưu trú ${snapshot.pendingCounts.hotel}. Cần bạn xử lý`,
    },
    spaToday: {
      total: tracked.length,
      caption: `${countByStatus(tracked, "InProgress")} đang làm, ${countByStatus(tracked, "Received")} đã tiếp nhận, ${countByStatus(tracked, "Confirmed")} chờ đến`,
    },
    cages: {
      occupied: occupied.length,
      active: snapshot.cages.filter((cage) => cage.isActive).length,
      caption: `Nhận hôm nay ${checkInsToday}, trả hôm nay ${checkOutsToday}`,
    },
    unpaid: {
      count: snapshot.unpaidPayments.length,
      total: unpaidTotal,
      caption: describeUnpaid(snapshot.unpaidPayments, unpaidTotal),
    },
  };
}

export type AttentionItem = {
  key: string;
  kind: "CostConfirmation" | "CheckIn" | "CheckOut";
  title: string;
  detail: string;
  // Chỉ lịch spa có trang chi tiết (MW-05); lịch lưu trú chưa có nên không có liên kết.
  href: string | null;
};

// MW-02 vùng 4 “Cần chú ý”, suy ra từ dữ liệu của vùng 2, 3: lịch chờ khách xác nhận chi phí, lịch lưu trú nhận hôm nay chưa thu
// tiền lưu trú, lịch lưu trú trả hôm nay. Mục “cần phân công lại” chưa có vì API chưa trả lý do (UI-Screens G-08).
export function buildAttentionItems(snapshot: DashboardSnapshot): AttentionItem[] {
  const dayKey = getStoreDateKey(snapshot.now);
  const cageCodes = new Map(snapshot.cages.map((cage) => [cage.cageId, cage.code]));
  const unpaidStayIds = new Set(
    snapshot.unpaidPayments.filter((payment) => payment.kind === "Stay").map((payment) => payment.appointmentId),
  );

  const costItems = snapshot.spaToday
    .filter((appointment) => appointment.pendingCostConfirmation?.status === "Pending")
    .map((appointment): AttentionItem => ({
      key: `cost-${appointment.appointmentId}`,
      kind: "CostConfirmation",
      title: `${appointment.petName ?? "Thú cưng"} chờ khách xác nhận chi phí`,
      detail: `${formatAppointmentCode(appointment.appointmentId)}. Hết hạn lúc ${formatTime(appointment.pendingCostConfirmation!.expiresAt)}, sau đó tự động hủy.`,
      href: ROUTES.appointmentDetail(appointment.appointmentId),
    }));

  const checkInItems = snapshot.hotelAppointments
    .filter(
      (appointment) =>
        appointment.status === "Confirmed" &&
        isOnStoreDay(appointment.plannedCheckIn, dayKey) &&
        unpaidStayIds.has(appointment.appointmentId),
    )
    .map((appointment): AttentionItem => ({
      key: `check-in-${appointment.appointmentId}`,
      kind: "CheckIn",
      title: `${appointment.petName ?? "Thú cưng"} nhận lúc ${formatTime(appointment.plannedCheckIn as string)}`,
      detail: `${formatAppointmentCode(appointment.appointmentId)}${describeCage(appointment, cageCodes)}. Chưa thu tiền lưu trú.`,
      href: null,
    }));

  const checkOutItems = snapshot.hotelAppointments
    .filter((appointment) => appointment.status === "InStay" && isOnStoreDay(appointment.plannedCheckOut, dayKey))
    .map((appointment): AttentionItem => ({
      key: `check-out-${appointment.appointmentId}`,
      kind: "CheckOut",
      title: `${appointment.petName ?? "Thú cưng"} trả lúc ${formatTime(appointment.plannedCheckOut as string)}`,
      detail: `${formatAppointmentCode(appointment.appointmentId)}${describeCage(appointment, cageCodes)}.`,
      href: null,
    }));

  return [...costItems, ...checkInItems, ...checkOutItems];
}

function describeCage(appointment: AppointmentDetail, cageCodes: Map<string, string>) {
  const code = appointment.cageId ? cageCodes.get(appointment.cageId) : undefined;
  return code ? `, chuồng ${code}` : "";
}

export type OccupiedCage = {
  cageId: string;
  label: string;
  species: Cage["species"];
  // “Trả 18:00 hôm nay” hoặc “Trả 17:00 ngày 07/10”.
  returnText: string;
};

// MW-02 vùng 5: chuồng đang có thú cưng, trả sớm nhất ở trên.
export function listOccupiedCages(snapshot: DashboardSnapshot): OccupiedCage[] {
  const dayKey = getStoreDateKey(snapshot.now);
  return snapshot.cages
    .filter((cage): cage is Cage & { occupant: NonNullable<Cage["occupant"]> } => Boolean(cage.occupant))
    .sort((a, b) => Date.parse(a.occupant.plannedCheckOut) - Date.parse(b.occupant.plannedCheckOut))
    .map((cage) => {
      const { plannedCheckOut, petName } = cage.occupant;
      const when = getStoreDateKey(plannedCheckOut) === dayKey ? "hôm nay" : `ngày ${formatShortDate(plannedCheckOut)}`;
      return { cageId: cage.cageId, label: `${cage.code}, ${petName}`, species: cage.species, returnText: `Trả ${formatTime(plannedCheckOut)} ${when}` };
    });
}

// MW-02 vùng 1: “Thứ ba 06/10/2026. Cập nhật lúc 09:20.”
export function describeUpdatedAt(now: string): string {
  const weekday = formatWeekday(now);
  return `${weekday.charAt(0).toLocaleUpperCase("vi-VN")}${weekday.slice(1)} ${formatDate(now)}. Cập nhật lúc ${formatTime(now)}.`;
}
