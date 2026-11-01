import type { PricingRow, Service, ServiceRequest, SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

// Thứ tự hiển thị loài và nhóm kích cỡ; chuột lang chỉ có Nhỏ, Lớn (BR-19, openapi ServiceRequest.pricing).
export const SPECIES_ORDER: Species[] = ["Dog", "Cat", "Rabbit", "GuineaPig"];

export const SPECIES_SIZE_GROUPS: Record<Species, SizeGroup[]> = {
  Dog: ["Small", "Medium", "Large"],
  Cat: ["Small", "Medium", "Large"],
  Rabbit: ["Small", "Medium", "Large"],
  GuineaPig: ["Small", "Large"],
};

export type PricingSlot = { species: Species; sizeGroup: SizeGroup };

// 11 ô (loài × nhóm) theo thứ tự cố định; `ServiceFormValues.rows[i]` ứng với `PRICING_SLOTS[i]`.
export const PRICING_SLOTS: PricingSlot[] = SPECIES_ORDER.flatMap((species) =>
  SPECIES_SIZE_GROUPS[species].map((sizeGroup) => ({ species, sizeGroup })),
);

export type PricingCellValues = {
  price: string;
  durationMinutes: string;
  staffRequired: "1" | "2";
};

export type ServiceFormValues = {
  name: string;
  description: string;
  latestStartTime: string;
  species: Species[];
  rows: PricingCellValues[];
};

export const FORM_MESSAGES = {
  nameRequired: "Vui lòng nhập tên dịch vụ.",
  nameTooLong: "Tên dịch vụ tối đa 150 ký tự.",
  slotTimeInvalid: "Vui lòng chọn mốc giờ hợp lệ.",
  speciesRequired: "Vui lòng chọn ít nhất một loài.",
} as const;

export const NAME_MAX_LENGTH = 150;

const PRICE_FORMAT = new Intl.NumberFormat("vi-VN");
// Giới hạn theo DB: Price numeric(12,0), DurationMinutes int (DatabaseDesign, ServicePricingConfiguration).
const PRICE_MAX_DIGITS = 12;
const DURATION_MAX = 2_147_483_647;

// “120.000” hoặc “120000” → “120000”; có ký tự khác chữ số → null.
export function normalizeInteger(text: string): string | null {
  const digits = text.replace(/[\s.]/g, "");
  return /^\d+$/.test(digits) ? digits : null;
}

export function createFormValues(service?: Service): ServiceFormValues {
  return {
    name: service?.name ?? "",
    description: service?.description ?? "",
    latestStartTime: service?.latestStartTime ?? "",
    species: SPECIES_ORDER.filter((species) => service?.pricing.some((row) => row.species === species)),
    rows: PRICING_SLOTS.map(({ species, sizeGroup }) => {
      const row = service?.pricing.find((item) => item.species === species && item.sizeGroup === sizeGroup);
      return {
        price: row ? PRICE_FORMAT.format(row.price) : "",
        durationMinutes: row ? String(row.durationMinutes) : "",
        staffRequired: row?.staffRequired === 2 ? "2" : "1",
      };
    }),
  };
}

export type PricingProblem = PricingSlot & { message: string };

// Chỉ kiểm các loài đang chọn (UI-Screens MW-06, SA 6.6): giá ≥ 0, thời lượng > 0, đủ mọi nhóm của loài áp dụng.
export function findPricingProblems({ species, rows }: Pick<ServiceFormValues, "species" | "rows">): PricingProblem[] {
  return PRICING_SLOTS.flatMap((slot, index) => {
    if (!species.includes(slot.species)) return [];
    const row = rows[index];
    const where = `nhóm ${SIZE_GROUP_LABELS[slot.sizeGroup]} của ${SPECIES_LABELS[slot.species]}`;
    if (row.price.trim() === "" || row.durationMinutes.trim() === "") {
      return [{ ...slot, message: `Thiếu giá/thời lượng cho ${where}.` }];
    }
    const price = normalizeInteger(row.price);
    const duration = normalizeInteger(row.durationMinutes);
    if (price === null || price.length > PRICE_MAX_DIGITS || duration === null || Number(duration) < 1 || Number(duration) > DURATION_MAX) {
      return [{ ...slot, message: `Giá phải từ 0 trở lên và thời lượng phải lớn hơn 0 (${where}).` }];
    }
    return [];
  });
}

// Chỉ gọi sau khi findPricingProblems trả mảng rỗng. `sizeGroup` trong pricing là dòng giá của danh mục
// do quản lý đặt (openapi PricingRow), không phải nhóm kích cỡ của thú cưng nên không vi phạm quy tắc “không gửi sizeGroup”.
export function toServiceRequest(values: ServiceFormValues): ServiceRequest {
  const description = values.description.trim();
  const pricing: PricingRow[] = PRICING_SLOTS.flatMap((slot, index) => {
    if (!values.species.includes(slot.species)) return [];
    const row = values.rows[index];
    return [
      {
        species: slot.species,
        sizeGroup: slot.sizeGroup,
        price: Number(normalizeInteger(row.price) ?? ""),
        durationMinutes: Number(normalizeInteger(row.durationMinutes) ?? ""),
        staffRequired: row.staffRequired === "2" ? 2 : 1,
      },
    ];
  });
  return {
    name: values.name.trim(),
    ...(description ? { description } : {}),
    latestStartTime: values.latestStartTime,
    pricing,
  };
}

// “Giá từ” ở bảng: giá thấp nhất trong các dòng giá; chưa có dòng giá → null.
export function getMinPrice(pricing: PricingRow[]): number | null {
  return pricing.length === 0 ? null : Math.min(...pricing.map((row) => row.price));
}

// Loài có dòng giá, theo thứ tự hiển thị.
export function getPricingSpecies(pricing: PricingRow[]): Species[] {
  return SPECIES_ORDER.filter((species) => pricing.some((row) => row.species === species));
}

export function countServices(services: Service[]) {
  const active = services.filter((service) => service.isActive).length;
  return { active, inactive: services.length - active };
}
