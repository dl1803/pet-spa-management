import { ApiError } from "@/lib/api/errors";
import type { Customer, Pet, PetRequest, PetSizeResult, WalkInCreated, WalkInRequest } from "@/lib/api/types";
import {
  createMockCustomers,
  createMockPets,
  createMockRecentAppointments,
  type CustomerRecentAppointment,
  mockUuid,
} from "@/features/reception-customers/mock-data";
import { getSizeGroup } from "@/lib/size-estimate";
import { normalizePhone } from "@/lib/validation";

// Dữ liệu mô phỏng thay cho GET /customers, POST /customers/walk-in, GET/POST /pets, GET/PUT /pets/{id}, GET /appointments?petId=;
// bước nối API thật sẽ thay các hàm này bằng hàm trong lib/api/endpoints.
export const CUSTOMERS_QUERY_KEY = ["customers"] as const;
export const PETS_QUERY_KEY = ["pets"] as const;
export const RECENT_APPOINTMENTS_QUERY_KEY = ["appointments", "recent"] as const;

// Mô phỏng độ trễ mạng khi gọi API.
const MOCK_DELAY_MS = 400;
// Giá trị đặc biệt để thử các kịch bản lỗi.
export const MOCK_NETWORK_ERROR_PHONE = "0999999999";
export const MOCK_WEIGHT_INVALID_REQUEST = 77;
export const MOCK_WEIGHT_NETWORK_ERROR = 88;

type MockStore = {
  customers: Customer[];
  pets: Pet[];
  recentAppointments: CustomerRecentAppointment[];
  nextCustomerIndex: number;
  nextPetIndex: number;
};

let store: MockStore | null = null;

function createStore(): MockStore {
  const customers = createMockCustomers();
  const pets = createMockPets();
  const recentAppointments = createMockRecentAppointments();
  return {
    customers,
    pets,
    recentAppointments,
    nextCustomerIndex: customers.length + 1,
    nextPetIndex: pets.length + 1,
  };
}

function getStore() {
  store ??= createStore();
  return store;
}

export function resetMockCustomerStore() {
  store = createStore();
}

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function networkError() {
  return new ApiError({ kind: "network" });
}

function notFound() {
  return new ApiError({
    kind: "http",
    status: 404,
    code: "NOT_FOUND",
    title: "Không tìm thấy",
    detail: "Không tìm thấy dữ liệu, có thể đã bị thay đổi.",
  });
}

function invalidRequest() {
  return new ApiError({
    kind: "http",
    status: 400,
    code: "VALIDATION_ERROR",
    title: "Dữ liệu không hợp lệ",
    detail: "Dữ liệu không hợp lệ, vui lòng kiểm tra lại thông tin.",
  });
}

function duplicateContact() {
  return new ApiError({
    kind: "http",
    status: 409,
    code: "DUPLICATE_CONTACT",
    title: "Thông tin liên hệ đã tồn tại",
    detail: "Số điện thoại này đã được sử dụng.",
  });
}

// search khớp một phần theo số điện thoại (openapi listCustomers). Chỉ khách đang có trong kho mô phỏng.
export async function mockListCustomers(search: string): Promise<Customer[]> {
  await wait();
  const term = normalizePhone(search);
  if (term === MOCK_NETWORK_ERROR_PHONE) throw networkError();
  if (term === "") return [];
  return getStore()
    .customers.filter((customer) => customer.phone.includes(term))
    .map((customer) => ({ ...customer }));
}

export async function mockCreateWalkInCustomer(request: WalkInRequest): Promise<WalkInCreated> {
  await wait();
  const phone = normalizePhone(request.phone);
  if (phone === MOCK_NETWORK_ERROR_PHONE) throw networkError();

  const current = getStore();
  if (current.customers.some((customer) => customer.phone === phone)) throw duplicateContact();

  const customerId = mockUuid("c2", current.nextCustomerIndex);
  current.nextCustomerIndex += 1;
  current.customers.push({ customerId, fullName: request.fullName.trim(), phone, email: null, isBookingLocked: false });
  return { customerId };
}

export async function mockListPets(customerId: string): Promise<Pet[]> {
  await wait();
  return getStore()
    .pets.filter((pet) => pet.customerId === customerId && pet.isActive)
    .map((pet) => ({ ...pet }));
}

// Lấy tối đa 5 lịch hẹn mới nhất của khách hàng theo thời gian giảm dần (UI-Screens SW-04 vùng 2, G-06; Frontend-Conventions §8).
export async function mockListRecentAppointments(customerId: string): Promise<CustomerRecentAppointment[]> {
  await wait();
  return getStore()
    .recentAppointments.filter((item) => item.customerId === customerId)
    .slice()
    .sort((a, b) => {
      const timeA = new Date(a.slotStart ?? a.plannedCheckIn ?? 0).getTime();
      const timeB = new Date(b.slotStart ?? b.plannedCheckIn ?? 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 5)
    .map((item) => ({ ...item }));
}

export async function mockGetPet(petId: string): Promise<Pet> {
  await wait();
  const pet = getStore().pets.find((item) => item.petId === petId && item.isActive);
  if (!pet) throw notFound();
  return { ...pet };
}

function checkPetRequest(request: PetRequest) {
  if (request.weightKg === MOCK_WEIGHT_NETWORK_ERROR) throw networkError();
  if (request.weightKg === MOCK_WEIGHT_INVALID_REQUEST) throw invalidRequest();
  // Nhóm kích cỡ do “backend” xác định; thiếu dữ liệu để xác định thì coi là yêu cầu sai.
  const sizeGroup = getSizeGroup({
    species: request.species,
    weightKg: request.weightKg,
    heightCm: request.heightCm ?? null,
  });
  if (sizeGroup === null) throw invalidRequest();
  return sizeGroup;
}

export async function mockCreatePet(request: PetRequest): Promise<PetSizeResult> {
  await wait();
  const current = getStore();
  if (request.customerId === undefined) throw invalidRequest();
  const customerId = request.customerId;
  if (!current.customers.some((customer) => customer.customerId === customerId)) throw notFound();
  const sizeGroup = checkPetRequest(request);

  const petId = mockUuid("b2", current.nextPetIndex);
  current.nextPetIndex += 1;
  current.pets.push({
    petId,
    customerId,
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
  });
  return { petId, sizeGroup };
}

export async function mockUpdatePet({ petId, request }: { petId: string; request: PetRequest }): Promise<PetSizeResult> {
  await wait();
  const pet = getStore().pets.find((item) => item.petId === petId && item.isActive);
  if (!pet) throw notFound();
  const sizeGroup = checkPetRequest(request);

  pet.name = request.name;
  pet.species = request.species;
  pet.breed = request.breed;
  pet.temperament = request.temperament ?? pet.temperament;
  pet.weightKg = request.weightKg;
  pet.heightCm = request.heightCm ?? null;
  pet.coatNote = request.coatNote ?? null;
  pet.notes = request.notes ?? null;
  pet.sizeGroup = sizeGroup;
  return { sizeGroup };
}

