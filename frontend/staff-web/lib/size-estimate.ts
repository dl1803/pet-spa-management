import type { SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

type Thresholds = { mediumFrom: number | null; largeFrom: number };

// Bảng mốc phân nhóm kích cỡ mặc định. Giá trị này cấu hình được ở backend và khách hàng
// không đọc được cấu hình, nên web chỉ dùng để xem tạm; nhóm chính thức là `sizeGroup` backend trả về.
const WEIGHT_THRESHOLDS: Record<Species, Thresholds> = {
  Dog: { mediumFrom: 10, largeFrom: 25 },
  Cat: { mediumFrom: 3, largeFrom: 5 },
  Rabbit: { mediumFrom: 1.5, largeFrom: 3 },
  // Chuột lang chỉ có nhóm Nhỏ và Lớn.
  GuineaPig: { mediumFrom: null, largeFrom: 1 },
};
const DOG_HEIGHT_THRESHOLDS: Thresholds = { mediumFrom: 35, largeFrom: 55 };

const SIZE_RANK: Record<SizeGroup, number> = { Small: 0, Medium: 1, Large: 2 };
const NUMBER_FORMAT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export function formatMeasure(value: number) {
  return NUMBER_FORMAT.format(value);
}

function classify(value: number, { mediumFrom, largeFrom }: Thresholds): SizeGroup {
  if (value >= largeFrom) return "Large";
  if (mediumFrom !== null && value >= mediumFrom) return "Medium";
  return "Small";
}

// Ví dụ: "Vừa (10 – dưới 25 kg)", "Nhỏ (dưới 35 cm)", "Lớn (từ 25 kg)".
function describeRange(group: SizeGroup, { mediumFrom, largeFrom }: Thresholds, unit: string) {
  const label = SIZE_GROUP_LABELS[group];
  if (group === "Large") return `${label} (từ ${formatMeasure(largeFrom)} ${unit})`;
  if (group === "Medium") {
    return `${label} (${formatMeasure(mediumFrom ?? largeFrom)} – dưới ${formatMeasure(largeFrom)} ${unit})`;
  }
  return `${label} (dưới ${formatMeasure(mediumFrom ?? largeFrom)} ${unit})`;
}

export type SizeBasis = { value: number; group: SizeGroup; rangeLabel: string };

export type SizeEstimate =
  | { status: "incomplete" }
  | { status: "ready"; group: SizeGroup; byWeight: SizeBasis; byHeight: SizeBasis | null };

type SizeInput = { species: Species; weightKg: number | null; heightCm: number | null };

function isPositive(value: number | null): value is number {
  return value !== null && value > 0;
}

export function estimateSize({ species, weightKg, heightCm }: SizeInput): SizeEstimate {
  if (!isPositive(weightKg)) return { status: "incomplete" };

  const weightThresholds = WEIGHT_THRESHOLDS[species];
  const weightGroup = classify(weightKg, weightThresholds);
  const byWeight: SizeBasis = {
    value: weightKg,
    group: weightGroup,
    rangeLabel: describeRange(weightGroup, weightThresholds, "kg"),
  };

  if (species !== "Dog") return { status: "ready", group: weightGroup, byWeight, byHeight: null };
  if (!isPositive(heightCm)) return { status: "incomplete" };

  // Chó: lấy nhóm cao hơn giữa cân nặng và chiều cao.
  const heightGroup = classify(heightCm, DOG_HEIGHT_THRESHOLDS);
  const byHeight: SizeBasis = {
    value: heightCm,
    group: heightGroup,
    rangeLabel: describeRange(heightGroup, DOG_HEIGHT_THRESHOLDS, "cm"),
  };
  const group = SIZE_RANK[heightGroup] > SIZE_RANK[weightGroup] ? heightGroup : weightGroup;
  return { status: "ready", group, byWeight, byHeight };
}

export function getSizeGroup(input: SizeInput): SizeGroup | null {
  const estimate = estimateSize(input);
  return estimate.status === "ready" ? estimate.group : null;
}

