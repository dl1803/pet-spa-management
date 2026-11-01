import type { PricingRow, Service, ServiceRequest, Species } from "@/lib/api/types";
import { SPECIES_SIZE_GROUPS } from "./forms";

// Dữ liệu mô phỏng theo UI demo (MW-06 và CW-03), đúng hình dạng Service của GET /services.
// Thay bằng dữ liệu API thật khi nối backend.

// Mặc định của Booking.SlotTimes (openapi ConfigSettings); thay bằng GET /config khi nối API.
export const MOCK_SLOT_TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

// Mỗi ô: [giá (đ), thời lượng (phút), số nhân viên (mặc định 1)] theo thứ tự nhóm của loài.
type Cell = [number, number, (1 | 2)?];

function pricing(species: Species, cells: Cell[]): PricingRow[] {
  return SPECIES_SIZE_GROUPS[species].map((sizeGroup, index) => ({
    species,
    sizeGroup,
    price: cells[index][0],
    durationMinutes: cells[index][1],
    staffRequired: cells[index][2] ?? 1,
  }));
}

const id = (n: number) => `d0000000-0000-4000-8000-00000000000${n}`;

export const MOCK_SERVICES: Service[] = [
  {
    serviceId: id(1),
    name: "Tắm & sấy lông",
    description: "Sữa tắm dịu nhẹ theo loại lông, sấy khô, chải tơi",
    latestStartTime: "19:00",
    isActive: true,
    pricing: [
      ...pricing("Dog", [[150000, 60], [180000, 75], [240000, 90]]),
      ...pricing("Cat", [[140000, 60], [170000, 60], [210000, 75]]),
      ...pricing("Rabbit", [[110000, 45], [130000, 45], [150000, 60]]),
      ...pricing("GuineaPig", [[90000, 30], [110000, 40]]),
    ],
  },
  {
    serviceId: id(2),
    name: "Cắt tỉa lông",
    description: "Tạo kiểu theo giống hoặc yêu cầu, tỉa gọn bàn chân",
    latestStartTime: "18:00",
    isActive: true,
    pricing: [
      ...pricing("Dog", [[120000, 60], [150000, 75], [200000, 90, 2]]),
      ...pricing("Cat", [[140000, 60], [160000, 60], [190000, 75]]),
    ],
  },
  {
    serviceId: id(3),
    name: "Vệ sinh tai & cắt móng",
    description: "Làm sạch tai, cắt và mài móng",
    latestStartTime: "19:00",
    isActive: true,
    pricing: [
      ...pricing("Dog", [[60000, 20], [80000, 25], [100000, 30]]),
      ...pricing("Cat", [[60000, 20], [70000, 20], [80000, 25]]),
      ...pricing("Rabbit", [[50000, 15], [50000, 15], [60000, 20]]),
      ...pricing("GuineaPig", [[40000, 15], [50000, 15]]),
    ],
  },
  {
    serviceId: id(4),
    name: "Gỡ rối & khử mùi lông",
    description: "Gỡ lông rối, vón cục và khử mùi",
    latestStartTime: "18:00",
    isActive: true,
    pricing: [
      ...pricing("Dog", [[90000, 30], [120000, 40], [160000, 50]]),
      ...pricing("Cat", [[80000, 30], [90000, 30], [110000, 40]]),
    ],
  },
  {
    serviceId: id(5),
    name: "Gói spa thư giãn",
    description: "Tắm, massage, dưỡng lông, vệ sinh tai móng",
    latestStartTime: "17:00",
    isActive: true,
    pricing: [
      ...pricing("Dog", [[320000, 120], [420000, 150], [560000, 180]]),
      ...pricing("Cat", [[300000, 120], [350000, 120], [420000, 150]]),
    ],
  },
  {
    // UI demo chỉ cho biết: chỉ áp dụng cho chó, giá từ 250.000đ, bắt đầu muộn nhất 17:00, đã ngừng.
    // Giá nhóm Vừa/Lớn và thời lượng là giá trị mô phỏng, không phải dữ liệu nghiệp vụ.
    serviceId: id(6),
    name: "Nhuộm lông tạo màu",
    description: "Nhuộm màu an toàn cho thú cưng",
    latestStartTime: "17:00",
    isActive: false,
    pricing: pricing("Dog", [[250000, 90], [300000, 105], [380000, 120]]),
  },
];

// Mô phỏng kết quả server sau POST/PUT /services: giữ serviceId, isActive; description bỏ trống → null.
export function buildMockService(request: ServiceRequest, base: Pick<Service, "serviceId" | "isActive">): Service {
  return {
    serviceId: base.serviceId,
    isActive: base.isActive,
    name: request.name,
    description: request.description ?? null,
    latestStartTime: request.latestStartTime,
    pricing: request.pricing,
  };
}
