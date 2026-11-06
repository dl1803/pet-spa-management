import type { AppointmentDetail, Pet, Photo } from "@/lib/api/types";
import type { ExecutionData } from "@/features/service-execution/execution";
import { getStoreDateKey } from "@/lib/time";

// Dữ liệu mô phỏng theo UI demo (SW-11), đúng hình dạng AppointmentDetail, Pet, Photo của openapi.
// Thay bằng dữ liệu API thật khi nối backend. Giờ hẹn, giờ tải ảnh, hạn xác nhận tính từ `now` để luôn là “hôm nay”.
const CUSTOMER_ID = "c0000000-0000-4000-8000-000000000001";
const STAFF_ID = "f0000000-0000-4000-8000-000000000001";

const SERVICE_BATH = { serviceId: "d0000000-0000-4000-8000-000000000001", name: "Tắm & sấy lông" };
const SERVICE_TRIM = { serviceId: "d0000000-0000-4000-8000-000000000002", name: "Cắt tỉa lông" };
const SERVICE_EAR_NAIL = { serviceId: "d0000000-0000-4000-8000-000000000003", name: "Vệ sinh tai & cắt móng" };
const SERVICE_RELAX = { serviceId: "d0000000-0000-4000-8000-000000000004", name: "Gói spa thư giãn" };

// Ảnh mẫu thay cho ảnh thật: nền xám có vệt sáng, mã hóa thẳng trong URL để không cần tệp ảnh.
const PLACEHOLDER_PHOTO_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6eae6"/><stop offset="1" stop-color="#d3dad5"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/></svg>',
)}`;

// Mã hiển thị “LH-…” lấy 8 ký tự đầu của ID nên 8 ký tự đầu của mỗi ID mô phỏng phải khác nhau.
export const MOCK_APPOINTMENT_IDS = {
  blocked: "1029a001-0000-4000-8000-000000000001",
  ready: "1030a002-0000-4000-8000-000000000002",
  inProgress: "1031a003-0000-4000-8000-000000000003",
} as const;

function storeIso(now: Date, time: string) {
  return `${getStoreDateKey(now)}T${time}:00+07:00`;
}

function minutesFrom(now: Date, minutes: number, extraSeconds = 0) {
  return new Date(now.getTime() + minutes * 60_000 + extraSeconds * 1000).toISOString();
}

function makePet(input: Pick<Pet, "petId" | "name" | "species" | "breed" | "temperament" | "weightKg" | "sizeGroup"> & Partial<Pet>): Pet {
  return { customerId: CUSTOMER_ID, isActive: true, ...input };
}

function makePhoto(photoId: string, kind: Photo["kind"], uploadedAt: string): Photo {
  return { photoId, kind, url: PLACEHOLDER_PHOTO_URL, uploadedAt };
}

export function createMockExecutions(now: Date): ExecutionData[] {
  const common = {
    type: "Spa",
    customerId: CUSTOMER_ID,
    staffRequired: 1,
    staff: [{ staffId: STAFF_ID, fullName: "Hạnh", isHolding: true }],
    createdAt: minutesFrom(now, -60 * 24 * 7),
    updatedAt: minutesFrom(now, -30),
  } as const satisfies Partial<AppointmentDetail>;

  // Chưa đủ điều kiện bắt đầu: chưa có ảnh trước, đang chờ khách xác nhận chi phí mới (Nhỏ → Vừa).
  const blocked: ExecutionData = {
    pet: makePet({
      petId: "b1000000-0000-4000-8000-000000000001",
      name: "Bông",
      species: "Dog",
      breed: "Poodle",
      temperament: "Normal",
      weightKg: 8.5,
      sizeGroup: "Small",
      coatNote: "xoăn, màu kem",
      notes: "dị ứng nhẹ với sữa tắm có mùi; hơi sợ máy sấy",
    }),
    appointment: {
      ...common,
      appointmentId: MOCK_APPOINTMENT_IDS.blocked,
      petId: "b1000000-0000-4000-8000-000000000001",
      customerName: "Trần Minh Anh",
      petName: "Bông",
      status: "Received",
      sizeGroup: "Small",
      actualWeightKg: 11.2,
      slotStart: storeIso(now, "09:00"),
      slotEnd: storeIso(now, "11:00"),
      services: [
        { ...SERVICE_BATH, isDone: false },
        { ...SERVICE_TRIM, isDone: false },
      ],
      pendingCostConfirmation: {
        actualWeightKg: 11.2,
        newSizeGroup: "Medium",
        oldAmount: 270000,
        newAmount: 330000,
        status: "Pending",
        createdAt: minutesFrom(now, -3),
        expiresAt: minutesFrom(now, 27, 2),
      },
    },
    photos: [],
  };

  // Đủ điều kiện bắt đầu: đã có ảnh trước, không chờ xác nhận chi phí.
  const ready: ExecutionData = {
    pet: makePet({
      petId: "b1000000-0000-4000-8000-000000000002",
      name: "Na",
      species: "Cat",
      breed: "Mèo Anh lông ngắn",
      temperament: "Calm",
      weightKg: 4.2,
      sizeGroup: "Small",
      coatNote: "lông ngắn, màu xám",
    }),
    appointment: {
      ...common,
      appointmentId: MOCK_APPOINTMENT_IDS.ready,
      petId: "b1000000-0000-4000-8000-000000000002",
      customerName: "Nguyễn Thu Hà",
      petName: "Na",
      status: "Received",
      sizeGroup: "Small",
      actualWeightKg: 4.2,
      slotStart: storeIso(now, "10:00"),
      slotEnd: storeIso(now, "11:20"),
      services: [
        { ...SERVICE_BATH, isDone: false },
        { ...SERVICE_EAR_NAIL, isDone: false },
      ],
      pendingCostConfirmation: null,
    },
    photos: [makePhoto("e1000000-0000-4000-8000-000000000001", "Before", minutesFrom(now, -5))],
  };

  // Đang thực hiện: 1/2 dịch vụ xong, đã có ảnh trước, chưa có ảnh sau.
  const inProgress: ExecutionData = {
    pet: makePet({
      petId: "b1000000-0000-4000-8000-000000000003",
      name: "Lu",
      species: "Dog",
      breed: "Corgi",
      temperament: "Normal",
      weightKg: 11.2,
      sizeGroup: "Medium",
      coatNote: "hai lớp, rụng nhiều",
      notes: "hay cắn máy sấy; cần nghỉ giữa các dịch vụ",
    }),
    appointment: {
      ...common,
      appointmentId: MOCK_APPOINTMENT_IDS.inProgress,
      petId: "b1000000-0000-4000-8000-000000000003",
      customerName: "Lê Quang Huy",
      petName: "Lu",
      status: "InProgress",
      sizeGroup: "Medium",
      actualWeightKg: 11.2,
      slotStart: storeIso(now, "13:00"),
      slotEnd: storeIso(now, "15:00"),
      services: [
        { ...SERVICE_BATH, isDone: true, doneAt: minutesFrom(now, -20), note: "Da hơi khô vùng lưng, đã dùng sữa tắm không mùi." },
        { ...SERVICE_TRIM, isDone: false },
      ],
      pendingCostConfirmation: null,
    },
    photos: [makePhoto("e1000000-0000-4000-8000-000000000002", "Before", minutesFrom(now, -75))],
  };

  return [blocked, ready, inProgress];
}

// Lịch spa đã hoàn tất, khớp từng dòng MOCK_WORK_HISTORY để nút “Xem” ở SW-12 mở được SW-11 ở chế độ chỉ xem.
// Không import chéo giữa các feature nên ID, giờ và dịch vụ được giữ khớp bằng test đối chiếu.
const pad2 = (n: number) => String(n).padStart(2, "0");

type CompletedInput = {
  n: number; // 1..8, trùng số thứ tự trong MOCK_WORK_HISTORY
  customerName: string;
  pet: Pick<Pet, "name" | "species" | "breed" | "temperament" | "weightKg"> & Partial<Pet>;
  start: string;
  end: string;
  services: { serviceId: string; name: string }[];
};

function completedExecution({ n, customerName, pet, start, end, services }: CompletedInput): ExecutionData {
  const petId = `b0000000-0000-4000-8000-0000000000${pad2(n)}`;
  return {
    pet: makePet({ petId, sizeGroup: "Small", ...pet }),
    appointment: {
      appointmentId: `a0000000-0000-4000-8000-0000000000${pad2(n)}`,
      type: "Spa",
      customerId: CUSTOMER_ID,
      customerName,
      petId,
      petName: pet.name,
      status: "Completed",
      sizeGroup: "Small",
      actualWeightKg: pet.weightKg,
      slotStart: start,
      slotEnd: end,
      staffRequired: 1,
      staff: [{ staffId: STAFF_ID, fullName: "Hạnh", isHolding: false }],
      createdAt: "2026-09-20T09:00:00+07:00",
      updatedAt: end,
      services: services.map((service) => ({ ...service, isDone: true, doneAt: end })),
      pendingCostConfirmation: null,
    },
    photos: [
      makePhoto(`e2000000-0000-4000-8000-0000000000${pad2(n)}`, "Before", start),
      makePhoto(`e3000000-0000-4000-8000-0000000000${pad2(n)}`, "After", end),
    ],
  };
}

export function createMockCompletedExecutions(): ExecutionData[] {
  return [
    completedExecution({
      n: 1,
      customerName: "Trần Minh Anh",
      pet: { name: "Bông", species: "Dog", breed: "Poodle", temperament: "Normal", weightKg: 8.5, coatNote: "xoăn, màu kem" },
      start: "2026-10-06T09:00:00+07:00",
      end: "2026-10-06T11:00:00+07:00",
      services: [SERVICE_BATH, SERVICE_TRIM],
    }),
    completedExecution({
      n: 2,
      customerName: "Phạm Quốc Bảo",
      pet: { name: "Bi", species: "Dog", breed: "Chihuahua", temperament: "Normal", weightKg: 3.1 },
      start: "2026-10-05T14:00:00+07:00",
      end: "2026-10-05T15:00:00+07:00",
      services: [SERVICE_BATH],
    }),
    completedExecution({
      n: 3,
      customerName: "Nguyễn Thu Hà",
      pet: { name: "Na", species: "Cat", breed: "Mèo Anh lông ngắn", temperament: "Calm", weightKg: 4.2, coatNote: "lông ngắn, màu xám" },
      start: "2026-10-05T10:00:00+07:00",
      end: "2026-10-05T11:20:00+07:00",
      services: [SERVICE_BATH, SERVICE_EAR_NAIL],
    }),
    completedExecution({
      n: 4,
      customerName: "Lê Quang Huy",
      pet: {
        name: "Lu",
        species: "Dog",
        breed: "Pomeranian",
        temperament: "Normal",
        weightKg: 4.8,
        notes: "hay cắn máy sấy; cần nghỉ giữa các dịch vụ",
      },
      start: "2026-10-03T13:00:00+07:00",
      end: "2026-10-03T15:00:00+07:00",
      services: [SERVICE_RELAX],
    }),
    completedExecution({
      n: 5,
      customerName: "Đỗ Khánh Linh",
      pet: { name: "Thỏ Sữa", species: "Rabbit", breed: "Holland Lop", temperament: "Calm", weightKg: 1.6 },
      start: "2026-10-02T09:00:00+07:00",
      end: "2026-10-02T09:45:00+07:00",
      services: [SERVICE_BATH],
    }),
    completedExecution({
      n: 6,
      customerName: "Vũ Hải Yến",
      pet: { name: "Bánh Bao", species: "GuineaPig", breed: "Heo Abyssinian", temperament: "Calm", weightKg: 1.1 },
      start: "2026-10-01T16:00:00+07:00",
      end: "2026-10-01T17:00:00+07:00",
      services: [SERVICE_BATH, SERVICE_EAR_NAIL],
    }),
    completedExecution({
      n: 7,
      customerName: "Hoàng Gia Bảo",
      pet: { name: "Mít", species: "Dog", breed: "Shiba Inu", temperament: "Difficult", weightKg: 9.0 },
      start: "2026-09-28T12:00:00+07:00",
      end: "2026-09-28T13:00:00+07:00",
      services: [SERVICE_BATH],
    }),
    completedExecution({
      n: 8,
      customerName: "Ngô Thanh Mai",
      pet: { name: "Pudding", species: "Cat", breed: "Munchkin", temperament: "Normal", weightKg: 3.6 },
      start: "2026-09-25T10:00:00+07:00",
      end: "2026-09-25T11:00:00+07:00",
      services: [SERVICE_BATH, SERVICE_TRIM],
    }),
  ];
}

export function findMockExecution(entries: ExecutionData[], appointmentId: string | undefined) {
  return entries.find((entry) => entry.appointment.appointmentId === appointmentId) ?? null;
}
