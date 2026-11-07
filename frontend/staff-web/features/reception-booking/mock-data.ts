import type { Customer, HotelPricingRow, Pet } from "@/lib/api/types";

const uuid = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

export const MOCK_CUSTOMERS: Customer[] = [
  { customerId: uuid("c2", 1), fullName: "Ngô Thanh Bình", phone: "0962345118", isBookingLocked: false },
  { customerId: uuid("c2", 2), fullName: "Trần Mỹ Linh", phone: "0912345678", isBookingLocked: false },
];

export const MOCK_PETS: Pet[] = [
  {
    petId: uuid("b2", 1),
    customerId: uuid("c2", 1),
    name: "Bắp",
    species: "Dog",
    breed: "Corgi",
    temperament: "Difficult",
    weightKg: 11,
    sizeGroup: "Medium",
    isActive: true,
  },
  {
    petId: uuid("b2", 2),
    customerId: uuid("c2", 1),
    name: "Mướp",
    species: "Cat",
    breed: "Anh lông ngắn",
    temperament: "Normal",
    weightKg: 4,
    sizeGroup: "Small",
    isActive: true,
  },
  {
    petId: uuid("b2", 3),
    customerId: uuid("c2", 1),
    name: "Cốm",
    species: "Rabbit",
    breed: "Hà Lan",
    temperament: "Calm",
    weightKg: 1.8,
    sizeGroup: "Small",
    isActive: true,
  },
];

export const MOCK_HOTEL_PRICING: HotelPricingRow[] = [
  { species: "Dog", sizeGroup: "Medium", pricePerNight: 220000, foodPerNight: 50000 },
  { species: "Cat", sizeGroup: "Small", pricePerNight: 120000, foodPerNight: 30000 },
  { species: "Rabbit", sizeGroup: "Small", pricePerNight: 90000, foodPerNight: 20000 },
];

export function findMockCustomer(customerId: string | null) {
  return MOCK_CUSTOMERS.find((customer) => customer.customerId === customerId) ?? null;
}

export function getMockPets(customerId: string) {
  return MOCK_PETS.filter((pet) => pet.customerId === customerId && pet.isActive);
}

