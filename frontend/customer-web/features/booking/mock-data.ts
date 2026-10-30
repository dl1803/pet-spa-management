import type { Pet, Service } from "@/lib/api/types";

const CUSTOMER_ID = "c0000000-0000-4000-8000-000000000001";

export const MOCK_PETS: Pet[] = [
  {
    petId: "b0000000-0000-4000-8000-000000000001",
    customerId: CUSTOMER_ID,
    name: "Bông",
    species: "Dog",
    breed: "Poodle",
    temperament: "Normal",
    weightKg: 9,
    sizeGroup: "Small",
    isActive: true,
  },
  {
    petId: "b0000000-0000-4000-8000-000000000002",
    customerId: CUSTOMER_ID,
    name: "Mochi",
    species: "Cat",
    breed: "Anh lông ngắn",
    temperament: "Calm",
    weightKg: 4.2,
    sizeGroup: "Medium",
    isActive: true,
  },
  {
    petId: "b0000000-0000-4000-8000-000000000003",
    customerId: CUSTOMER_ID,
    name: "Bún",
    species: "Rabbit",
    breed: "Holland Lop",
    temperament: "Difficult",
    weightKg: 1.2,
    sizeGroup: "Small",
    isActive: true,
  },
];

export const MOCK_SERVICES: Service[] = [
  {
    serviceId: "d0000000-0000-4000-8000-000000000001",
    name: "Tắm & sấy lông",
    latestStartTime: "19:00",
    isActive: true,
    pricing: [
      { species: "Dog", sizeGroup: "Small", price: 150000, durationMinutes: 60, staffRequired: 1 },
      { species: "Cat", sizeGroup: "Medium", price: 170000, durationMinutes: 60, staffRequired: 1 },
      { species: "Rabbit", sizeGroup: "Small", price: 110000, durationMinutes: 45, staffRequired: 1 },
    ],
  },
  {
    serviceId: "d0000000-0000-4000-8000-000000000002",
    name: "Cắt tỉa lông",
    latestStartTime: "18:00",
    isActive: true,
    pricing: [
      { species: "Dog", sizeGroup: "Small", price: 120000, durationMinutes: 60, staffRequired: 1 },
      { species: "Cat", sizeGroup: "Medium", price: 160000, durationMinutes: 60, staffRequired: 1 },
    ],
  },
  {
    serviceId: "d0000000-0000-4000-8000-000000000003",
    name: "Vệ sinh tai & cắt móng",
    latestStartTime: "19:00",
    isActive: true,
    pricing: [
      { species: "Dog", sizeGroup: "Small", price: 60000, durationMinutes: 20, staffRequired: 1 },
      { species: "Cat", sizeGroup: "Medium", price: 70000, durationMinutes: 20, staffRequired: 1 },
      { species: "Rabbit", sizeGroup: "Small", price: 50000, durationMinutes: 15, staffRequired: 1 },
    ],
  },
  {
    serviceId: "d0000000-0000-4000-8000-000000000004",
    name: "Gỡ rối & khử mùi lông",
    latestStartTime: "18:00",
    isActive: true,
    pricing: [
      { species: "Dog", sizeGroup: "Small", price: 90000, durationMinutes: 30, staffRequired: 1 },
      { species: "Cat", sizeGroup: "Medium", price: 90000, durationMinutes: 30, staffRequired: 1 },
    ],
  },
  {
    serviceId: "d0000000-0000-4000-8000-000000000005",
    name: "Gói spa thư giãn",
    latestStartTime: "17:00",
    isActive: true,
    pricing: [
      { species: "Dog", sizeGroup: "Small", price: 320000, durationMinutes: 120, staffRequired: 1 },
      { species: "Cat", sizeGroup: "Medium", price: 350000, durationMinutes: 120, staffRequired: 1 },
    ],
  },
];

