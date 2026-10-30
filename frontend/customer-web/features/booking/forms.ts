import type { Pet, PricingRow, Service } from "@/lib/api/types";

export type SpaBookingStep1Values = {
  petId: string;
  serviceIds: string[];
};

export const SERVICE_REQUIRED_MESSAGE = "Vui lòng chọn ít nhất một dịch vụ.";

export type ApplicableService = {
  service: Service;
  pricing: PricingRow;
};

// Dịch vụ chỉ áp dụng khi có dòng giá đúng loài và nhóm kích cỡ của thú cưng.
export function getApplicableServices(services: Service[], pet: Pet): ApplicableService[] {
  return services.flatMap((service) => {
    const pricing = service.pricing.find((row) => row.species === pet.species && row.sizeGroup === pet.sizeGroup);
    return pricing ? [{ service, pricing }] : [];
  });
}

// Chọn sẵn thú cưng theo id yêu cầu; không có hoặc không hợp lệ thì chọn thú cưng đầu tiên.
export function getInitialPetId(pets: Pet[], requestedPetId: string | null): string {
  return pets.find((pet) => pet.petId === requestedPetId)?.petId ?? pets[0]?.petId ?? "";
}

// Đổi thú cưng thì bỏ chọn các dịch vụ không còn áp dụng cho thú cưng mới.
export function keepApplicableServiceIds(serviceIds: string[], applicable: ApplicableService[]): string[] {
  return serviceIds.filter((id) => applicable.some(({ service }) => service.serviceId === id));
}

// Tính toán các thông số tóm tắt tạm tính để hiển thị trên giao diện.
export function summarizeSelection(pet: Pet, selected: ApplicableService[]) {
  return {
    totalPrice: selected.reduce((sum, { pricing }) => sum + pricing.price, 0),
    totalMinutes: selected.reduce((sum, { pricing }) => sum + pricing.durationMinutes, 0),
    // Lấy giá trị lớn nhất của staffRequired, tối thiểu 2 nếu thú cưng có tính cách khó tính.
    staffRequired: Math.max(
      pet.temperament === "Difficult" ? 2 : 1,
      ...selected.map(({ pricing }) => pricing.staffRequired),
    ),
  };
}

