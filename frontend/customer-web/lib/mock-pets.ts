import { ApiError } from "@/lib/api/errors";
import type { Pet, PetPage, PetRequest, PetSizeResult } from "@/lib/api/types";
import { getSizeGroup } from "@/lib/size-estimate";
import { MOCK_PETS } from "@/lib/mock-data";

// Dữ liệu giả cho màn thú cưng. Chờ nối API thật: GET /pets, GET /pets/{id}, POST /pets,
// PUT /pets/{id}, DELETE /pets/{id}. Hồ sơ giữ trong bộ nhớ trình duyệt; tải lại trang thì về dữ liệu ban đầu.
//
// Kết quả suy ra từ đầu vào để thử từng trạng thái (so khớp tên, không phân biệt hoa thường):
//   Tạo / sửa hồ sơ, đặt tên:  "Lỗi mạng" mất mạng · "Lỗi 400" 400 · "Lỗi 429" 429 · "Lỗi 500" 500 (không lưu).
//   Tải danh sách:             còn hồ sơ tên "Tải lại lỗi" thì GET /pets trả 500 (hồ sơ này lưu được).
//   Gỡ hồ sơ có tên:           "Gỡ lỗi 403" trả 403 FORBIDDEN · "Gỡ lỗi 404" trả 404 và hồ sơ biến mất khỏi danh sách.
//   Mở trang sửa:              petId không tồn tại trả 404; FOREIGN_PET_ID (hồ sơ của khách khác) trả 403.

const MOCK_DELAY_MS = 600;

export const FOREIGN_PET_ID = "b0000000-0000-4000-8000-0000000000ff";

// Chi tiết bổ sung: Bún chưa có số liệu nên để trống.
const SEED_DETAILS: Record<string, Partial<Pick<Pet, "heightCm" | "coatNote" | "notes">>> = {
  Bông: { heightCm: 30, coatNote: "Xoăn, kem", notes: "Dị ứng nhẹ với sữa tắm có mùi; hơi sợ máy sấy." },
  Mochi: { coatNote: "Ngắn, xám", notes: "Đã tiêm phòng đủ, ngoan khi tắm." },
};

let pets: Pet[] = MOCK_PETS.map((pet) => ({ ...pet, ...SEED_DETAILS[pet.name] }));
let createdCount = 0;

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase("vi-VN");
}

function notFound() {
  return new ApiError({
    kind: "http",
    status: 404,
    code: "NOT_FOUND",
    title: "Không tìm thấy dữ liệu",
    detail: "Không tìm thấy dữ liệu, có thể đã bị thay đổi.",
  });
}

function forbidden() {
  return new ApiError({
    kind: "http",
    status: 403,
    code: "FORBIDDEN",
    title: "Không có quyền",
    detail: "Bạn không có quyền thực hiện thao tác này.",
  });
}

function getSaveFailure(name: string): ApiError | null {
  switch (normalizeName(name)) {
    case "lỗi mạng":
      return new ApiError({ kind: "network" });
    case "lỗi 400":
      return new ApiError({
        kind: "http",
        status: 400,
        code: "VALIDATION_ERROR",
        title: "Dữ liệu không hợp lệ",
        detail: "Dữ liệu không hợp lệ, vui lòng kiểm tra lại thông tin.",
      });
    case "lỗi 429":
      return new ApiError({
        kind: "http",
        status: 429,
        code: "RATE_LIMITED",
        title: "Vượt giới hạn tần suất",
        detail: "Bạn đã thử quá nhiều lần.",
      });
    case "lỗi 500":
      return new ApiError({ kind: "http", status: 500 });
    default:
      return null;
  }
}

function getSizeOrThrow(request: PetRequest) {
  const sizeGroup = getSizeGroup({
    species: request.species,
    weightKg: request.weightKg,
    heightCm: request.heightCm ?? null,
  });
  if (sizeGroup === null) {
    throw new ApiError({
      kind: "http",
      status: 400,
      code: "VALIDATION_ERROR",
      title: "Dữ liệu không hợp lệ",
      detail: "Dữ liệu không hợp lệ, vui lòng kiểm tra lại thông tin.",
    });
  }
  return sizeGroup;
}

type ListPetsParams = { page: number; pageSize: number };

export async function mockListPets({ page, pageSize }: ListPetsParams): Promise<PetPage> {
  await wait();

  if (pets.some((pet) => normalizeName(pet.name) === "tải lại lỗi")) {
    throw new ApiError({ kind: "http", status: 500 });
  }

  const start = (page - 1) * pageSize;
  return {
    items: pets.slice(start, start + pageSize).map((pet) => ({ ...pet })),
    page,
    pageSize,
    total: pets.length,
  };
}

export async function mockGetPet(petId: string): Promise<Pet> {
  await wait();

  if (petId === FOREIGN_PET_ID) throw forbidden();
  const pet = pets.find((item) => item.petId === petId);
  if (!pet) throw notFound();
  return { ...pet };
}

export async function mockCreatePet(request: PetRequest): Promise<PetSizeResult> {
  await wait();

  const failure = getSaveFailure(request.name);
  if (failure) throw failure;

  const sizeGroup = getSizeOrThrow(request);
  createdCount += 1;
  const petId = `b${String(createdCount).padStart(7, "0")}-0000-4000-8000-0000000000aa`;
  pets = [
    ...pets,
    {
      petId,
      customerId: pets[0]?.customerId ?? "c0000000-0000-4000-8000-000000000001",
      name: request.name,
      species: request.species,
      breed: request.breed,
      temperament: request.temperament ?? "Normal",
      weightKg: request.weightKg,
      heightCm: request.heightCm ?? null,
      coatNote: request.coatNote ?? null,
      notes: request.notes ?? null,
      sizeGroup,
      isActive: true,
    },
  ];
  return { petId, sizeGroup };
}

type UpdatePetParams = { petId: string; request: PetRequest };

export async function mockUpdatePet({ petId, request }: UpdatePetParams): Promise<PetSizeResult> {
  await wait();

  if (!pets.some((pet) => pet.petId === petId)) throw notFound();
  const failure = getSaveFailure(request.name);
  if (failure) throw failure;

  const sizeGroup = getSizeOrThrow(request);
  pets = pets.map((pet) =>
    pet.petId === petId
      ? {
          ...pet,
          name: request.name,
          species: request.species,
          breed: request.breed,
          temperament: request.temperament ?? pet.temperament,
          weightKg: request.weightKg,
          heightCm: request.heightCm ?? null,
          coatNote: request.coatNote ?? null,
          notes: request.notes ?? null,
          sizeGroup,
        }
      : pet,
  );
  return { sizeGroup };
}

export async function mockDeletePet(petId: string): Promise<void> {
  await wait();

  const pet = pets.find((item) => item.petId === petId);
  if (!pet) throw notFound();

  switch (normalizeName(pet.name)) {
    case "gỡ lỗi 403":
      throw forbidden();
    case "gỡ lỗi 404":
      pets = pets.filter((item) => item.petId !== petId);
      throw notFound();
    default:
      pets = pets.filter((item) => item.petId !== petId);
  }
}

