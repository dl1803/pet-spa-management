import type { Cage, CageCreateRequest, HotelPricing, SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";

// Thứ tự hiển thị loài và nhóm kích cỡ; chuột lang chỉ có Nhỏ, Lớn (BR-19).
export const SPECIES_ORDER: Species[] = ["Dog", "Cat", "Rabbit", "GuineaPig"];

export const SPECIES_SIZE_GROUPS: Record<Species, SizeGroup[]> = {
  Dog: ["Small", "Medium", "Large"],
  Cat: ["Small", "Medium", "Large"],
  Rabbit: ["Small", "Medium", "Large"],
  GuineaPig: ["Small", "Large"],
};

export const SIZE_GROUP_ORDER: SizeGroup[] = ["Small", "Medium", "Large"];

// Nhóm kích cỡ được chọn theo loài; chưa chọn loài thì hiện đủ ba nhóm.
export function getSizeGroupOptions(species: Species | ""): SizeGroup[] {
  return species === "" ? SIZE_GROUP_ORDER : SPECIES_SIZE_GROUPS[species];
}

export function isSpecies(value: string): value is Species {
  return SPECIES_ORDER.some((species) => species === value);
}

export type PricingSlot = { species: Species; sizeGroup: SizeGroup };

// 11 dòng (loài × nhóm) theo thứ tự cố định; `HotelPricingFormValues.rows[i]` ứng với `PRICING_SLOTS[i]`.
export const PRICING_SLOTS: PricingSlot[] = SPECIES_ORDER.flatMap((species) =>
  SPECIES_SIZE_GROUPS[species].map((sizeGroup) => ({ species, sizeGroup })),
);

// Giới hạn theo DB: Cage.Code varchar(20); số tiền numeric(12,0) (DatabaseDesign, bảng Cage, HotelPricing).
export const CODE_MAX_LENGTH = 20;
const MONEY_MAX_DIGITS = 12;

export const FORM_MESSAGES = {
  codeRequired: "Vui lòng nhập mã chuồng.",
  codeTooLong: `Mã chuồng tối đa ${CODE_MAX_LENGTH} ký tự.`,
  // Cũng là câu của 409 DUPLICATE_CAGE_CODE hiện dưới ô mã chuồng (SA 6.6, UI-Screens MW-07·D1).
  codeDuplicate: "Mã chuồng đã tồn tại.",
  speciesRequired: "Vui lòng chọn loài.",
  sizeGroupRequired: "Vui lòng chọn nhóm kích cỡ.",
  lateFeeRequired: "Vui lòng nhập mức phí mỗi lần.",
  lateFeeInvalid: "Mức phí phải là số nguyên từ 0 trở lên, ví dụ 50.000.",
} as const;

// ───────────── Chuồng (MW-07·D1) ─────────────

export type CageFormValues = {
  code: string;
  // "" = chưa chọn.
  species: Species | "";
  sizeGroup: SizeGroup | "";
};

export function createCageFormValues(cage?: Cage): CageFormValues {
  return { code: cage?.code ?? "", species: cage?.species ?? "", sizeGroup: cage?.sizeGroup ?? "" };
}

export function validateCode(value: string): true | string {
  const code = value.trim();
  if (code === "") return FORM_MESSAGES.codeRequired;
  return code.length <= CODE_MAX_LENGTH || FORM_MESSAGES.codeTooLong;
}

export function validateSpecies(value: Species | ""): true | string {
  return value !== "" || FORM_MESSAGES.speciesRequired;
}

export function validateSizeGroup(value: SizeGroup | ""): true | string {
  return value !== "" || FORM_MESSAGES.sizeGroupRequired;
}

// Nhóm kích cỡ đang chọn không thuộc loài vừa đổi (ví dụ Vừa của chuột lang) thì trả "" để người dùng chọn lại,
// không tự chọn thay.
export function resolveSizeGroup(species: Species | "", sizeGroup: SizeGroup | ""): SizeGroup | "" {
  if (species === "" || sizeGroup === "") return sizeGroup;
  return SPECIES_SIZE_GROUPS[species].includes(sizeGroup) ? sizeGroup : "";
}

// Chỉ gọi sau khi form đã qua kiểm tra. Không âm thầm đặt loài hay nhóm mặc định: chọn nhầm là sai dữ liệu chuồng.
// `sizeGroup` là nhóm phù hợp của chuồng do quản lý đặt (openapi CageCreateRequest), không phải nhóm kích cỡ của thú cưng
// nên không vi phạm quy tắc “không gửi sizeGroup”.
export function toCageRequest(values: CageFormValues): CageCreateRequest {
  if (values.species === "" || values.sizeGroup === "") throw new Error("Chưa chọn loài hoặc nhóm kích cỡ.");
  return { code: values.code.trim(), species: values.species, sizeGroup: values.sizeGroup };
}

// ───────────── Giá lưu trú và phí trả muộn (MW-07 tab Giá) ─────────────

const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");

// “180.000”, “180,000”, “180 000” hoặc “180000” → 180000. Chỉ bỏ dấu phân nhóm khi từng nhóm có đúng ba chữ số để
// “1.5” không bị đọc thành 15; có ký tự khác hoặc quá 12 chữ số → null (numeric(12,0)).
export function parseMoneyInput(text: string): number | null {
  const amount = text.trim();
  if (!/^(?:\d+|\d{1,3}([.,\s])\d{3}(?:\1\d{3})*)$/.test(amount)) return null;
  const digits = amount.replace(/[.,\s]/g, "");
  if (digits.length > MONEY_MAX_DIGITS) return null;
  return Number(digits);
}

export type HotelPricingRowValues = {
  // Chuỗi người nhập, ví dụ “180.000”.
  pricePerNight: string;
  foodPerNight: string;
};

export type HotelPricingFormValues = {
  rows: HotelPricingRowValues[];
  lateFeePerBlock: string;
};

export function createHotelPricingFormValues(pricing: HotelPricing): HotelPricingFormValues {
  return {
    rows: PRICING_SLOTS.map(({ species, sizeGroup }) => {
      const row = pricing.pricing.find((item) => item.species === species && item.sizeGroup === sizeGroup);
      return {
        pricePerNight: row ? MONEY_FORMAT.format(row.pricePerNight) : "",
        foodPerNight: row ? MONEY_FORMAT.format(row.foodPerNight) : "",
      };
    }),
    lateFeePerBlock: MONEY_FORMAT.format(pricing.lateFeePerBlock),
  };
}

export type PricingProblem = PricingSlot & { message: string };

// Mỗi dòng (loài × nhóm) phải có đủ giá chỗ ở và giá thức ăn, số nguyên ≥ 0 (BR-22, FR-HTL-03; UI-Screens MW-07).
export function findPricingProblems(rows: HotelPricingRowValues[]): PricingProblem[] {
  return PRICING_SLOTS.flatMap((slot, index) => {
    const row = rows[index];
    const where = `nhóm ${SIZE_GROUP_LABELS[slot.sizeGroup]} của ${SPECIES_LABELS[slot.species]}`;
    if (!row || row.pricePerNight.trim() === "" || row.foodPerNight.trim() === "") {
      return [{ ...slot, message: `Thiếu giá chỗ ở hoặc giá thức ăn cho ${where}.` }];
    }
    if (parseMoneyInput(row.pricePerNight) === null || parseMoneyInput(row.foodPerNight) === null) {
      return [{ ...slot, message: `Giá phải là số nguyên từ 0 trở lên (${where}).` }];
    }
    return [];
  });
}

export function validateLateFee(value: string): true | string {
  if (value.trim() === "") return FORM_MESSAGES.lateFeeRequired;
  return parseMoneyInput(value) !== null || FORM_MESSAGES.lateFeeInvalid;
}

function requireMoney(text: string | undefined): number {
  const amount = parseMoneyInput(text ?? "");
  if (amount === null) throw new Error("Giá chưa hợp lệ.");
  return amount;
}

// Chỉ gọi sau khi findPricingProblems trả mảng rỗng và validateLateFee trả true. Chỉ gửi giá; web không tính tiền lưu trú.
export function toHotelPricingRequest(values: HotelPricingFormValues): HotelPricing {
  return {
    pricing: PRICING_SLOTS.map((slot, index) => ({
      species: slot.species,
      sizeGroup: slot.sizeGroup,
      pricePerNight: requireMoney(values.rows[index]?.pricePerNight),
      foodPerNight: requireMoney(values.rows[index]?.foodPerNight),
    })),
    lateFeePerBlock: requireMoney(values.lateFeePerBlock),
  };
}
