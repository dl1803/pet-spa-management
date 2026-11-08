import type { ActualWeightRequest } from "@/lib/api/types";

export type WeightFormValues = {
  actualWeight: string;
};

export const EMPTY_WEIGHT_VALUES: WeightFormValues = { actualWeight: "" };

export const WEIGHT_REQUIRED_MESSAGE = "Vui lòng nhập cân nặng thực tế lớn hơn 0.";

const WEIGHT_PATTERN = /^\d+(?:[.,]\d+)?$/;
// Tối đa 2 chữ số thập phân để không làm tròn mất cân nặng đã ghi (“1,45 kg”, “0,05 kg”).
const KG_FORMAT = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

// Cho phép dấu phẩy thập phân (“11,2” -> 11.2). Chuỗi không phải số thập phân thì trả null.
export function parseWeightInput(value: string): number | null {
  const text = value.trim();
  if (!WEIGHT_PATTERN.test(text)) return null;
  const weight = Number(text.replace(",", "."));
  return Number.isFinite(weight) ? weight : null;
}

export function validateActualWeight(value: string): true | string {
  const weight = parseWeightInput(value);
  return weight !== null && weight > 0 ? true : WEIGHT_REQUIRED_MESSAGE;
}

// Chỉ gửi actualWeightKg; backend sẽ tự xác định nhóm kích cỡ và chi phí.
export function toActualWeightRequest(values: WeightFormValues): ActualWeightRequest | null {
  const weight = parseWeightInput(values.actualWeight);
  return weight !== null && weight > 0 ? { actualWeightKg: weight } : null;
}

export function formatWeightInput(kg: number) {
  return String(kg).replace(".", ",");
}

export function formatKg(kg: number) {
  return `${KG_FORMAT.format(kg)} kg`;
}

// Chênh lệch tuyệt đối so với cân nặng khai báo (kết quả đối chiếu do backend quyết định).
export function formatWeightDifference(actualKg: number, declaredKg: number) {
  return formatKg(Math.round(Math.abs(actualKg - declaredKg) * 100) / 100);
}
