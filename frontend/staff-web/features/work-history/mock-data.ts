import type { AppointmentDetail } from "@/lib/api/types";
import type { WorkHistoryEntry } from "./list";

// Dữ liệu mô phỏng theo UI demo (SW-12), đúng hình dạng Appointment/AppointmentDetail của openapi.
// Thay bằng dữ liệu API thật khi nối backend.
const CUSTOMER_ID = "c0000000-0000-4000-8000-000000000001";

const SERVICE_BATH = { serviceId: "d0000000-0000-4000-8000-000000000001", name: "Tắm & sấy lông" };
const SERVICE_TRIM = { serviceId: "d0000000-0000-4000-8000-000000000002", name: "Cắt tỉa lông" };
const SERVICE_EAR_NAIL = { serviceId: "d0000000-0000-4000-8000-000000000003", name: "Vệ sinh tai & cắt móng" };
const SERVICE_RELAX = { serviceId: "d0000000-0000-4000-8000-000000000004", name: "Gói spa thư giãn" };

const id = (n: number) => `a0000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const petId = (n: number) => `b0000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

type SpaInput = {
  n: number;
  petN: number;
  petName: string;
  start: string;
  end: string;
  services: { serviceId: string; name: string }[];
};

function completedSpa({ n, petN, petName, start, end, services }: SpaInput): AppointmentDetail {
  return {
    appointmentId: id(n),
    type: "Spa",
    customerId: CUSTOMER_ID,
    petId: petId(petN),
    petName,
    status: "Completed",
    sizeGroup: "Small",
    slotStart: start,
    slotEnd: end,
    staffRequired: 1,
    createdAt: "2026-09-20T09:00:00+07:00",
    updatedAt: end,
    services: services.map((service) => ({ ...service, isDone: true, doneAt: end })),
  };
}

export const MOCK_WORK_HISTORY: WorkHistoryEntry[] = [
  {
    species: "Dog",
    appointment: completedSpa({ n: 1, petN: 1, petName: "Bông", start: "2026-10-06T09:00:00+07:00", end: "2026-10-06T11:00:00+07:00", services: [SERVICE_BATH, SERVICE_TRIM] }),
  },
  {
    species: "Dog",
    appointment: completedSpa({ n: 2, petN: 2, petName: "Bi", start: "2026-10-05T14:00:00+07:00", end: "2026-10-05T15:00:00+07:00", services: [SERVICE_BATH] }),
  },
  {
    species: "Cat",
    appointment: completedSpa({ n: 3, petN: 3, petName: "Na", start: "2026-10-05T10:00:00+07:00", end: "2026-10-05T11:20:00+07:00", services: [SERVICE_BATH, SERVICE_EAR_NAIL] }),
  },
  {
    species: "Dog",
    appointment: completedSpa({ n: 4, petN: 4, petName: "Lu", start: "2026-10-03T13:00:00+07:00", end: "2026-10-03T15:00:00+07:00", services: [SERVICE_RELAX] }),
  },
  {
    species: "Rabbit",
    appointment: completedSpa({ n: 5, petN: 5, petName: "Thỏ Sữa", start: "2026-10-02T09:00:00+07:00", end: "2026-10-02T09:45:00+07:00", services: [SERVICE_BATH] }),
  },
  {
    species: "GuineaPig",
    appointment: completedSpa({ n: 6, petN: 6, petName: "Bánh Bao", start: "2026-10-01T16:00:00+07:00", end: "2026-10-01T17:00:00+07:00", services: [SERVICE_BATH, SERVICE_EAR_NAIL] }),
  },
  {
    species: "Dog",
    appointment: completedSpa({ n: 7, petN: 7, petName: "Mít", start: "2026-09-28T12:00:00+07:00", end: "2026-09-28T13:00:00+07:00", services: [SERVICE_BATH] }),
  },
  {
    species: "Cat",
    appointment: completedSpa({ n: 8, petN: 8, petName: "Pudding", start: "2026-09-25T10:00:00+07:00", end: "2026-09-25T11:00:00+07:00", services: [SERVICE_BATH, SERVICE_TRIM] }),
  },
];
