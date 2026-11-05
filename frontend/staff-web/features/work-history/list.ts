import type { AppointmentDetail, Species } from "@/lib/api/types";
import { getStoreDateKey } from "@/lib/time";

// Một dòng của SW-12: lịch spa đã hoàn tất kèm loài của thú cưng để vẽ hình.
// Thứ tự dữ liệu thật: GET /appointments (danh sách), GET /appointments/{id} (dịch vụ), GET /pets/{petId} (loài) – UI-Screens G-05.
export type WorkHistoryEntry = {
  appointment: AppointmentDetail;
  species: Species;
};

export const WORK_HISTORY_PAGE_SIZE = 20;

export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

// Tháng dạng "YYYY-MM" theo múi giờ cửa hàng.
export function getMonthKey(isoDate: string): string {
  return getStoreDateKey(isoDate).slice(0, 7);
}

// "2026-10" -> "Tháng 10/2026".
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `Tháng ${month}/${year}`;
}

function getEntryStart(entry: WorkHistoryEntry): string | null {
  return entry.appointment.slotStart ?? null;
}

// Chỉ lịch spa đã hoàn tất có giờ bắt đầu; sắp xếp mới nhất trước (Frontend-Conventions mục 8).
export function selectWorkHistory(entries: WorkHistoryEntry[]): WorkHistoryEntry[] {
  return entries
    .filter(
      (entry) =>
        entry.appointment.type === "Spa" &&
        entry.appointment.status === "Completed" &&
        getEntryStart(entry) !== null &&
        entry.appointment.slotEnd != null,
    )
    .sort((a, b) => Date.parse(getEntryStart(b) ?? "") - Date.parse(getEntryStart(a) ?? ""));
}

// Các tháng có lịch, tháng mới nhất trước.
export function listMonthKeys(entries: WorkHistoryEntry[]): string[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    const start = getEntryStart(entry);
    if (start !== null) keys.add(getMonthKey(start));
  }
  return [...keys].sort().reverse();
}

// Tháng không hợp lệ hoặc không có lịch -> tháng mới nhất; không có tháng nào -> null.
export function resolveMonthKey(value: string | null, monthKeys: string[]): string | null {
  if (value !== null && monthKeys.includes(value)) return value;
  return monthKeys[0] ?? null;
}

// Lọc ở web: API chưa có tham số tháng (UI-Screens G-06).
export function filterByMonth(entries: WorkHistoryEntry[], monthKey: string | null): WorkHistoryEntry[] {
  if (monthKey === null) return [];
  return entries.filter((entry) => {
    const start = getEntryStart(entry);
    return start !== null && getMonthKey(start) === monthKey;
  });
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  return { page: current, items: items.slice((current - 1) * pageSize, current * pageSize) };
}
