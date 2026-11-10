import { toApiError } from "@/lib/api/errors";
import type { Pet, PetRequest, Species, Temperament, WalkInRequest } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { normalizePhone, PHONE_REQUIRED_MESSAGE } from "@/lib/validation";

// ---- Tìm khách và ghi nhận khách vãng lai (SW-04) ----

export type SearchFormValues = { search: string };

export type WalkInFormValues = { fullName: string; phone: string };

export const DUPLICATE_CONTACT_MESSAGE = "Thông tin liên hệ đã có, vui lòng chọn khách hàng hiện có.";
export const WALK_IN_NOTE =
  "Khách vãng lai không có tài khoản đăng nhập và không nhận thông báo trên web. Lễ tân liên hệ khách qua số điện thoại này khi cần.";

export function walkInSavedMessage(fullName: string) {
  return `Đã ghi nhận khách vãng lai ${fullName}`;
}

// Ô tìm chỉ cần có nội dung; backend tìm khớp một phần theo số điện thoại.
export function validateSearchTerm(value: string): true | string {
  return normalizePhone(value) !== "" || PHONE_REQUIRED_MESSAGE;
}

// Request chỉ có fullName, phone (không email – openapi WalkInRequest). Số điện thoại gửi dạng liền.
export function toWalkInRequest(values: WalkInFormValues): WalkInRequest {
  return { fullName: values.fullName.trim(), phone: normalizePhone(values.phone) };
}

export function isDuplicateContactError(error: unknown) {
  const apiError = toApiError(error);
  return apiError.status === 409 && apiError.code === "DUPLICATE_CONTACT";
}

export function isNotFoundError(error: unknown) {
  return toApiError(error).status === 404;
}

// Dùng chung hàm getInitials với reception-booking (Frontend-Architecture §3.3).
export { getInitials } from "@/features/reception-booking/forms";

// Ví dụ: “Chó Poodle, 9,0 kg, nhóm Nhỏ”.
export function describePet(pet: Pet) {
  return `${SPECIES_LABELS[pet.species]} ${pet.breed}, ${formatWeight(pet.weightKg)}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`;
}

// ---- Hồ sơ thú cưng (SW-05, cùng luật với CW-05) ----

export type PetFormValues = {
  species: Species;
  name: string;
  breed: string;
  // Giữ dạng chuỗi như người dùng nhập; đổi sang số khi tạo request.
  weight: string;
  height: string;
  temperament: Temperament;
  coatNote: string;
  notes: string;
};

// Mặc định: loài đầu tiên (Chó) và tính cách Bình thường.
export const PET_FORM_DEFAULT_VALUES: PetFormValues = {
  species: "Dog",
  name: "",
  breed: "",
  weight: "",
  height: "",
  temperament: "Normal",
  coatNote: "",
  notes: "",
};

export const SPECIES_ORDER = ["Dog", "Cat", "Rabbit", "GuineaPig"] as const satisfies readonly Species[];

export const TEMPERAMENT_OPTIONS = [
  { value: "Calm", description: "Dễ gần, hợp tác" },
  { value: "Normal", description: "Đôi lúc cần dỗ" },
  { value: "Difficult", description: "Hay cắn, cào, sợ người lạ" },
] as const satisfies readonly { value: Temperament; description: string }[];

export const PET_SAVED_MESSAGE = "Đã lưu hồ sơ thú cưng";

export const PET_NAME_MAX_LENGTH = 100;
export const PET_BREED_MAX_LENGTH = 100;
export const PET_COAT_NOTE_MAX_LENGTH = 255;
export const PET_NOTES_MAX_LENGTH = 1000;
export const PET_WEIGHT_MAX = 150;
export const PET_HEIGHT_MAX = 150;

export const PET_NAME_REQUIRED_MESSAGE = "Vui lòng nhập tên thú cưng.";
export const PET_NAME_TOO_LONG_MESSAGE = `Tên tối đa ${PET_NAME_MAX_LENGTH} ký tự.`;
export const PET_BREED_REQUIRED_MESSAGE = "Vui lòng nhập giống.";
export const PET_BREED_TOO_LONG_MESSAGE = `Giống tối đa ${PET_BREED_MAX_LENGTH} ký tự.`;
export const PET_WEIGHT_REQUIRED_MESSAGE = "Vui lòng nhập cân nặng lớn hơn 0.";
export const PET_WEIGHT_TOO_LARGE_MESSAGE = `Cân nặng tối đa ${PET_WEIGHT_MAX} kg.`;
export const PET_HEIGHT_REQUIRED_MESSAGE = "Vui lòng nhập chiều cao của chó.";
export const PET_HEIGHT_TOO_LARGE_MESSAGE = `Chiều cao tối đa ${PET_HEIGHT_MAX} cm.`;
export const PET_COAT_NOTE_TOO_LONG_MESSAGE = `Đặc điểm lông tối đa ${PET_COAT_NOTE_MAX_LENGTH} ký tự.`;
export const PET_NOTES_TOO_LONG_MESSAGE = `Ghi chú tối đa ${PET_NOTES_MAX_LENGTH} ký tự.`;

const DECIMAL_PATTERN = /^\d+(?:[.,]\d+)?$/;

// Cho phép dấu phẩy thập phân (“9,5” → 9.5). Chuỗi không phải số thập phân thì trả null.
export function parseDecimal(value: string): number | null {
  const text = value.trim();
  if (!DECIMAL_PATTERN.test(text)) return null;
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function isDog(species: Species) {
  return species === "Dog";
}

export function validatePetName(value: string): true | string {
  const name = value.trim();
  if (name === "") return PET_NAME_REQUIRED_MESSAGE;
  return name.length <= PET_NAME_MAX_LENGTH || PET_NAME_TOO_LONG_MESSAGE;
}

export function validatePetBreed(value: string): true | string {
  const breed = value.trim();
  if (breed === "") return PET_BREED_REQUIRED_MESSAGE;
  return breed.length <= PET_BREED_MAX_LENGTH || PET_BREED_TOO_LONG_MESSAGE;
}

export function validatePetWeight(value: string): true | string {
  const weight = parseDecimal(value);
  if (weight === null || weight <= 0) return PET_WEIGHT_REQUIRED_MESSAGE;
  if (weight > PET_WEIGHT_MAX) return PET_WEIGHT_TOO_LARGE_MESSAGE;
  return true;
}

// Chiều cao vai chỉ bắt buộc với chó; loài khác bỏ qua (ô bị vô hiệu hóa).
export function validatePetHeight(value: string, values: PetFormValues): true | string {
  if (!isDog(values.species)) return true;
  const height = parseDecimal(value);
  if (height === null || height <= 0) return PET_HEIGHT_REQUIRED_MESSAGE;
  if (height > PET_HEIGHT_MAX) return PET_HEIGHT_TOO_LARGE_MESSAGE;
  return true;
}

export function validateCoatNote(value: string): true | string {
  return value.trim().length <= PET_COAT_NOTE_MAX_LENGTH || PET_COAT_NOTE_TOO_LONG_MESSAGE;
}

export function validatePetNotes(value: string): true | string {
  return value.trim().length <= PET_NOTES_MAX_LENGTH || PET_NOTES_TOO_LONG_MESSAGE;
}

function formatDecimal(value: number) {
  return String(value).replace(".", ",");
}

export function toPetFormValues(pet: Pet): PetFormValues {
  return {
    species: pet.species,
    name: pet.name,
    breed: pet.breed,
    weight: formatDecimal(pet.weightKg),
    height: pet.heightCm === null || pet.heightCm === undefined ? "" : formatDecimal(pet.heightCm),
    temperament: pet.temperament,
    coatNote: pet.coatNote ?? "",
    notes: pet.notes ?? "",
  };
}

// Request không có sizeGroup (backend xác định); trường tùy chọn rỗng gửi null (giống Web Khách hàng).
// `customerId` chỉ truyền khi tạo hồ sơ (lễ tân bắt buộc kèm); khi sửa API bỏ qua trường này.
// Trả null khi số nhập không hợp lệ (đã bị validate chặn trước khi gọi hàm này).
export function toPetRequest(values: PetFormValues, customerId?: string): PetRequest | null {
  const weightKg = parseDecimal(values.weight);
  if (weightKg === null || weightKg <= 0 || weightKg > PET_WEIGHT_MAX) return null;

  const heightCm = parseDecimal(values.height);
  if (isDog(values.species) && (heightCm === null || heightCm <= 0 || heightCm > PET_HEIGHT_MAX)) return null;

  const coatNote = values.coatNote.trim();
  const notes = values.notes.trim();
  const request: PetRequest = {
    name: values.name.trim(),
    species: values.species,
    breed: values.breed.trim(),
    temperament: values.temperament,
    weightKg,
    heightCm: isDog(values.species) ? heightCm : null,
    coatNote: coatNote ? coatNote : null,
    notes: notes ? notes : null,
  };
  return customerId === undefined ? request : { ...request, customerId };
}

