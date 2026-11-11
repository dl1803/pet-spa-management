import { ApiError } from "@/lib/api/errors";
import type { Cage, CageCreateRequest, CageOccupant, CageUpdateRequest, HotelPricing, SizeGroup, Species } from "@/lib/api/types";
import { FORM_MESSAGES } from "./forms";

// Dữ liệu mô phỏng theo UI demo (MW-07), đúng hình dạng Cage của GET /cages và HotelPricing của GET /hotel/pricing.
// Thay bằng dữ liệu API thật khi nối backend.
const cageId = (n: number) => `c1000000-0000-4000-8000-0000000000${n.toString().padStart(2, "0")}`;

const occupant = (n: number, petName: string, customerName: string, plannedCheckOut: string): CageOccupant => ({
  petId: `7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f${(40 + n).toString()}`,
  petName,
  customerId: `8b1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f${(40 + n).toString()}`,
  customerName,
  plannedCheckOut,
});

type Row = [code: string, species: Species, sizeGroup: SizeGroup, state?: CageOccupant | "inactive"];

// 12 chuồng: 11 đang sử dụng (3 đang chứa, 8 trống), 1 ngừng sử dụng (A4). “Hôm nay” là 06/10/2026 (lib/mock-shop-day.ts).
const ROWS: Row[] = [
  ["A1", "Dog", "Small"],
  ["A2", "Dog", "Medium", occupant(1, "Bơ", "Trương Hoài Nam", "2026-10-07T17:00:00+07:00")],
  ["A3", "Dog", "Large"],
  ["A4", "Dog", "Medium", "inactive"],
  ["B1", "Cat", "Medium", occupant(2, "Tuyết", "Nguyễn Hải Yến", "2026-10-06T18:00:00+07:00")],
  ["B2", "Cat", "Small"],
  ["B3", "Cat", "Medium"],
  ["B4", "Cat", "Large"],
  ["C1", "Rabbit", "Small"],
  ["C2", "Rabbit", "Medium"],
  ["D1", "GuineaPig", "Small"],
  ["D2", "GuineaPig", "Large", occupant(3, "Kem", "Lý Thảo", "2026-10-09T10:00:00+07:00")],
];

export const MOCK_CAGES: Cage[] = ROWS.map(([code, species, sizeGroup, state], index) => ({
  cageId: cageId(index + 1),
  code,
  species,
  sizeGroup,
  isActive: state !== "inactive",
  occupant: state === undefined || state === "inactive" ? null : state,
}));

// Giá theo UI demo (MW-07 tab Giá): [chỗ ở/đêm, thức ăn/đêm] theo thứ tự nhóm của loài.
export const MOCK_HOTEL_PRICING: HotelPricing = {
  pricing: [
    { species: "Dog", sizeGroup: "Small", pricePerNight: 180000, foodPerNight: 40000 },
    { species: "Dog", sizeGroup: "Medium", pricePerNight: 220000, foodPerNight: 50000 },
    { species: "Dog", sizeGroup: "Large", pricePerNight: 280000, foodPerNight: 70000 },
    { species: "Cat", sizeGroup: "Small", pricePerNight: 150000, foodPerNight: 35000 },
    { species: "Cat", sizeGroup: "Medium", pricePerNight: 170000, foodPerNight: 40000 },
    { species: "Cat", sizeGroup: "Large", pricePerNight: 200000, foodPerNight: 45000 },
    { species: "Rabbit", sizeGroup: "Small", pricePerNight: 100000, foodPerNight: 25000 },
    { species: "Rabbit", sizeGroup: "Medium", pricePerNight: 120000, foodPerNight: 30000 },
    { species: "Rabbit", sizeGroup: "Large", pricePerNight: 140000, foodPerNight: 35000 },
    { species: "GuineaPig", sizeGroup: "Small", pricePerNight: 80000, foodPerNight: 20000 },
    { species: "GuineaPig", sizeGroup: "Large", pricePerNight: 100000, foodPerNight: 25000 },
  ],
  lateFeePerBlock: 50000,
};

// Mã chuồng là duy nhất (Cage.Code UNIQUE): đã có chuồng khác dùng mã này thì API trả 409 DUPLICATE_CAGE_CODE
// (openapi createCage, updateCage). So sánh đúng từng ký tự sau khi bỏ khoảng trắng hai đầu, như ràng buộc UNIQUE của DB;
// gồm cả chuồng đã ngừng sử dụng vì chuồng đó vẫn giữ mã.
function assertCodeAvailable(current: Cage[], code: string, exceptCageId?: string) {
  if (current.some((item) => item.cageId !== exceptCageId && item.code === code)) {
    throw new ApiError({ kind: "http", status: 409, code: "DUPLICATE_CAGE_CODE", title: FORM_MESSAGES.codeDuplicate });
  }
}

// Mô phỏng POST /cages: chuồng mới đang sử dụng, chưa có thú cưng, thêm cuối danh sách. Ném ApiError giống API thật
// để CageForm xử lý một cách duy nhất khi nối backend.
export function createMockCage(current: Cage[], request: CageCreateRequest, id: string): Cage[] {
  const code = request.code.trim();
  assertCodeAvailable(current, code);
  return [...current, { cageId: id, code, species: request.species, sizeGroup: request.sizeGroup, isActive: true, occupant: null }];
}

// Mô phỏng PUT /cages/{id}: đổi mã, loài, nhóm kích cỡ; giữ nguyên trạng thái sử dụng và thú cưng đang chứa.
// Không đổi mã sang mã của chuồng khác (409 DUPLICATE_CAGE_CODE); giữ nguyên mã của chính nó thì hợp lệ.
export function updateMockCage(current: Cage[], id: string, request: CageUpdateRequest): Cage[] {
  const code = request.code?.trim();
  if (code !== undefined) assertCodeAvailable(current, code, id);
  return current.map((item) =>
    item.cageId === id
      ? { ...item, code: code ?? item.code, species: request.species ?? item.species, sizeGroup: request.sizeGroup ?? item.sizeGroup }
      : item,
  );
}

// Mô phỏng PATCH /cages/{id}/status: chỉ đổi IsActive.
export function setMockCageActive(current: Cage[], id: string, isActive: boolean): Cage[] {
  return current.map((item) => (item.cageId === id ? { ...item, isActive } : item));
}
