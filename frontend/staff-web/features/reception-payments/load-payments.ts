import type { CounterPaymentRow, CounterPaymentsData, HotelRate, PricedService } from "@/features/reception-payments/payment";
import { getAppointment, listAppointments, type ListAppointmentsParams } from "@/lib/api/endpoints/appointments";
import { getHotelPricing } from "@/lib/api/endpoints/hotel";
import { listAppointmentPayments } from "@/lib/api/endpoints/payments";
import { getPet } from "@/lib/api/endpoints/pets";
import { listServices } from "@/lib/api/endpoints/services";
import type { Appointment, AppointmentDetail, HotelPricing, Payment, Service, SizeGroup, Species } from "@/lib/api/types";
import { getStoreDateKey } from "@/lib/time";

// Số lịch tối đa mỗi lần gọi GET /appointments (backend giới hạn pageSize 1–100).
const LIST_PAGE_SIZE = 100;

// Lịch có thể có khoản đến hạn (BR-07): spa Hoàn tất, lưu trú Đã xác nhận (tiền lưu trú), lưu trú Đang lưu trú (phí trả muộn).
// Lịch trong ngày theo UI-Screens SW-09: spa và lưu trú Đã xác nhận lọc theo ngày hôm nay; lịch Đang lưu trú là lịch đang ở cửa hàng nên không lọc ngày.
export function buildDueListParams(todayKey: string): ListAppointmentsParams[] {
  return [
    { type: "Spa", status: "Completed", date: todayKey, pageSize: LIST_PAGE_SIZE },
    { type: "Hotel", status: "Confirmed", date: todayKey, pageSize: LIST_PAGE_SIZE },
    { type: "Hotel", status: "InStay", pageSize: LIST_PAGE_SIZE },
  ];
}

// Khoản chưa thanh toán và đã đến hạn theo trạng thái lịch (Payment.IsDueFor ở backend): Spa ↔ Completed, Stay ↔ Confirmed, LateFee ↔ InStay.
export function isCounterPaymentDue(payment: Payment, appointment: Appointment) {
  if (payment.status !== "Unpaid") return false;
  switch (payment.kind) {
    case "Spa":
      return appointment.type === "Spa" && appointment.status === "Completed";
    case "Stay":
      return appointment.type === "Hotel" && appointment.status === "Confirmed";
    case "LateFee":
      return appointment.type === "Hotel" && appointment.status === "InStay";
  }
}

export function findHotelRate(pricing: HotelPricing | null, species: Species, sizeGroup: SizeGroup): HotelRate | null {
  const row = pricing?.pricing.find((item) => item.species === species && item.sizeGroup === sizeGroup);
  return row ? { pricePerNight: row.pricePerNight, foodPerNight: row.foodPerNight } : null;
}

// Giá từng dịch vụ của lịch spa để giải thích cách tính. Thiếu giá của bất kỳ dịch vụ nào (ví dụ dịch vụ đã ngừng) thì bỏ cả danh sách, không hiện thiếu dòng.
export function buildPricedServices(
  appointment: AppointmentDetail,
  species: Species,
  catalog: Service[] | null,
): PricedService[] {
  const items = appointment.services ?? [];
  if (catalog === null || items.length === 0) return [];
  const priced: PricedService[] = [];
  for (const item of items) {
    const service = catalog.find((candidate) => candidate.serviceId === item.serviceId);
    const price = service?.pricing.find((row) => row.species === species && row.sizeGroup === appointment.sizeGroup)?.price;
    if (!service || price === undefined) return [];
    priced.push({ name: service.name, price });
  }
  return priced;
}

// Dữ liệu chỉ để giải thích cách tính: lỗi tải thì bỏ phần giải thích, không chặn việc thu tiền.
async function optional<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch {
    return null;
  }
}

// Thay cho dữ liệu mô phỏng: danh sách lịch có thể đến hạn → GET /appointments/{id}/payments (giữ khoản đến hạn)
// → GET /pets/{id} (loài) → GET /appointments/{id} (dịch vụ lịch spa), GET /services, GET /hotel/pricing (chỉ để giải thích cách tính).
// Lễ tân không gọi được GET /payments (chỉ Quản lý) nên không có cách lấy khoản theo trạng thái trực tiếp (G-07).
export async function loadCounterPayments(confirmerName: string): Promise<CounterPaymentsData> {
  const todayKey = getStoreDateKey(new Date());
  const pages = await Promise.all(buildDueListParams(todayKey).map((params) => listAppointments(params)));
  const appointments = pages.flatMap((page) => page.items);

  const paymentLists = await Promise.all(appointments.map((appointment) => listAppointmentPayments(appointment.appointmentId)));
  const due = appointments.flatMap((appointment, index) =>
    paymentLists[index].filter((payment) => isCounterPaymentDue(payment, appointment)).map((payment) => ({ payment, appointment })),
  );
  if (due.length === 0) return { rows: [], confirmerName };

  const petIds = [...new Set(due.map((item) => item.appointment.petId))];
  const pets = await Promise.all(petIds.map((petId) => getPet(petId)));
  const speciesByPet = new Map(pets.map((pet) => [pet.petId, pet.species]));

  const spaIds = [...new Set(due.filter((item) => item.payment.kind === "Spa").map((item) => item.appointment.appointmentId))];
  const detailList = await Promise.all(spaIds.map((appointmentId) => optional(getAppointment(appointmentId))));
  const details = new Map<string, AppointmentDetail>();
  detailList.forEach((detail, index) => {
    if (detail) details.set(spaIds[index], detail);
  });

  const hotelPricing = due.some((item) => item.payment.kind === "Stay") ? await optional(getHotelPricing()) : null;

  const catalogKeys = [
    ...new Set(
      spaIds.flatMap((appointmentId) => {
        const detail = details.get(appointmentId);
        const species = detail ? speciesByPet.get(detail.petId) : undefined;
        return detail && species ? [`${species}|${detail.sizeGroup}`] : [];
      }),
    ),
  ];
  const catalogList = await Promise.all(
    catalogKeys.map((key) => {
      const [species, sizeGroup] = key.split("|") as [Species, SizeGroup];
      return optional(listServices({ species, sizeGroup }));
    }),
  );
  const catalogs = new Map(catalogKeys.map((key, index) => [key, catalogList[index]]));

  const rows: CounterPaymentRow[] = due.map(({ payment, appointment }) => {
    // Mọi petId đã được tải ở trên; GET /pets/{id} lỗi thì cả lần tải đã báo lỗi.
    const species = speciesByPet.get(appointment.petId) as Species;
    const detail: AppointmentDetail = details.get(appointment.appointmentId) ?? appointment;
    return {
      payment,
      appointment: detail,
      species,
      hotelRate: payment.kind === "Stay" ? findHotelRate(hotelPricing, species, appointment.sizeGroup) : null,
      services:
        payment.kind === "Spa" ? buildPricedServices(detail, species, catalogs.get(`${species}|${detail.sizeGroup}`) ?? null) : [],
      // API chưa trả thời điểm hoàn tất lịch spa nên không hiện dòng "Hoàn tất lúc".
      completedAt: null,
    };
  });
  return { rows, confirmerName };
}
