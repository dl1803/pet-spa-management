import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerCard } from "../features/reception-customers/components/customer-card.tsx";
import { CustomerPetList } from "../features/reception-customers/components/customer-pet-list.tsx";
import { CustomerSearchForm } from "../features/reception-customers/components/customer-search-form.tsx";
import { DuplicateCustomerCard } from "../features/reception-customers/components/duplicate-customer-card.tsx";
import { WalkInForm } from "../features/reception-customers/components/walk-in-form.tsx";
import { CustomerBreadcrumb } from "../features/reception-customers/components/customer-breadcrumb.tsx";
import { PetFormFields } from "../features/reception-customers/components/pet-form-fields.tsx";
import { ServingCustomerStrip } from "../features/reception-customers/components/serving-customer-strip.tsx";
import { SizeEstimateCard } from "../features/reception-customers/components/size-estimate-card.tsx";
import {
  describePet,
  getInitials,
  isDuplicateContactError,
  isNotFoundError,
  parseDecimal,
  PET_FORM_DEFAULT_VALUES,
  toPetFormValues,
  toPetRequest,
  toWalkInRequest,
  validatePetHeight,
  validatePetWeight,
  validateSearchTerm,
} from "../features/reception-customers/forms.ts";
import { createMockCustomers, createMockPets, MOCK_CUSTOMER_IDS } from "../features/reception-customers/mock-data.ts";
import {
  mockCreatePet,
  mockCreateWalkInCustomer,
  mockGetPet,
  mockListCustomers,
  mockListPets,
  mockUpdatePet,
  MOCK_NETWORK_ERROR_PHONE,
  MOCK_WEIGHT_INVALID_REQUEST,
  MOCK_WEIGHT_NETWORK_ERROR,
  resetMockCustomerStore,
} from "../features/reception-customers/mock-api.ts";
import { ApiError } from "../lib/api/errors.ts";
import { parseServingCustomer, serializeServingCustomer } from "../lib/serving-customer.tsx";
import { estimateSize, getSizeGroup } from "../lib/size-estimate.ts";
import { normalizePhone, validateFullName, validateOptionalEmail, validatePhone } from "../lib/validation.ts";

test("số điện thoại: bỏ khoảng trắng, dấu chấm, gạch ngang; 10 chữ số bắt đầu bằng 0", () => {
  assert.equal(normalizePhone("0962 345-118"), "0962345118");
  assert.equal(normalizePhone("0962.345.118"), "0962345118");
  assert.equal(validatePhone(""), "Vui lòng nhập số điện thoại.");
  assert.equal(validatePhone("   "), "Vui lòng nhập số điện thoại.");
  assert.equal(validatePhone("12345"), "Số điện thoại chưa đúng định dạng.");
  assert.equal(validatePhone("1962345118"), "Số điện thoại chưa đúng định dạng.");
  assert.equal(validatePhone("0962 345 118"), true);
});

test("họ tên và email: bắt buộc, giới hạn độ dài", () => {
  assert.equal(validateFullName("  "), "Vui lòng nhập họ tên.");
  assert.equal(validateFullName("a".repeat(151)), "Họ tên tối đa 150 ký tự.");
  assert.equal(validateFullName("Ngô Thanh Bình"), true);
  assert.equal(validateOptionalEmail(""), true);
  assert.equal(validateOptionalEmail("abc"), "Email chưa đúng định dạng.");
});

test("nhóm kích cỡ dự kiến: chó lấy nhóm cao hơn giữa cân nặng và chiều cao", () => {
  const dog = estimateSize({ species: "Dog", weightKg: 11, heightCm: 30 });
  assert.equal(dog.status, "ready");
  assert.equal(dog.group, "Medium");
  assert.equal(dog.byWeight.group, "Medium");
  assert.equal(dog.byHeight.group, "Small");
  assert.equal(getSizeGroup({ species: "Dog", weightKg: 9, heightCm: 40 }), "Medium");
  assert.equal(estimateSize({ species: "Dog", weightKg: 11, heightCm: null }).status, "incomplete");
});

test("nhóm kích cỡ dự kiến: loài khác chỉ theo cân nặng; chuột lang chỉ có Nhỏ và Lớn; thiếu cân nặng thì chưa đủ dữ liệu", () => {
  assert.equal(getSizeGroup({ species: "Cat", weightKg: 4.2, heightCm: null }), "Medium");
  assert.equal(getSizeGroup({ species: "Rabbit", weightKg: 1.8, heightCm: null }), "Medium");
  assert.equal(getSizeGroup({ species: "GuineaPig", weightKg: 0.9, heightCm: null }), "Small");
  assert.equal(getSizeGroup({ species: "GuineaPig", weightKg: 1.2, heightCm: null }), "Large");
  assert.equal(getSizeGroup({ species: "Cat", weightKg: null, heightCm: null }), null);
  assert.equal(getSizeGroup({ species: "Cat", weightKg: 0, heightCm: null }), null);
});

const DOG_VALUES = { ...PET_FORM_DEFAULT_VALUES, name: " Bắp ", breed: "Corgi", weight: "11,5", height: "30" };

test("ô tìm: chỉ cần có nội dung; yêu cầu ghi nhận khách vãng lai gửi tên đã cắt và số điện thoại liền", () => {
  assert.equal(validateSearchTerm("  "), "Vui lòng nhập số điện thoại.");
  assert.equal(validateSearchTerm("0962"), true);
  assert.deepEqual(toWalkInRequest({ fullName: "  Ngô Thanh Bình ", phone: "0962 345-118" }), {
    fullName: "Ngô Thanh Bình",
    phone: "0962345118",
  });
});

test("hàm phụ: chữ cái đầu, mô tả thú cưng, nhận diện lỗi", () => {
  assert.equal(getInitials("Ngô Thanh Bình"), "TB");
  assert.equal(getInitials("An"), "AN");
  assert.equal(getInitials("  "), "");
  const [, , , bong, mochi] = createMockPets();
  assert.equal(describePet(bong), "Chó Poodle, 9,0 kg, nhóm Nhỏ");
  assert.equal(describePet(mochi), "Mèo Anh lông ngắn, 4,2 kg, nhóm Vừa");
  const duplicate = new ApiError({ kind: "http", status: 409, code: "DUPLICATE_CONTACT" });
  assert.equal(isDuplicateContactError(duplicate), true);
  assert.equal(isDuplicateContactError(new ApiError({ kind: "http", status: 409, code: "SLOT_FULL" })), false);
  assert.equal(isNotFoundError(new ApiError({ kind: "http", status: 404, code: "NOT_FOUND" })), true);
  assert.equal(isNotFoundError(new Error("x")), false);
});

test("form thú cưng: số thập phân dấu phẩy, chiều cao chỉ bắt buộc với chó", () => {
  assert.equal(parseDecimal("9,5"), 9.5);
  assert.equal(parseDecimal("abc"), null);
  assert.equal(validatePetWeight(""), "Vui lòng nhập cân nặng lớn hơn 0.");
  assert.equal(validatePetWeight("151"), "Cân nặng tối đa 150 kg.");
  assert.equal(validatePetWeight("11,5"), true);
  assert.equal(validatePetHeight("", DOG_VALUES), "Vui lòng nhập chiều cao của chó.");
  assert.equal(validatePetHeight("", { ...DOG_VALUES, species: "Cat" }), true);
});

test("request thú cưng: không có sizeGroup; customerId chỉ khi tạo; trường tùy chọn rỗng thành null", () => {
  const created = toPetRequest(DOG_VALUES, MOCK_CUSTOMER_IDS.binh);
  assert.deepEqual(created, {
    name: "Bắp",
    species: "Dog",
    breed: "Corgi",
    temperament: "Normal",
    weightKg: 11.5,
    heightCm: 30,
    coatNote: null,
    notes: null,
    customerId: MOCK_CUSTOMER_IDS.binh,
  });
  assert.equal("sizeGroup" in created, false);
  const updated = toPetRequest({ ...DOG_VALUES, species: "Cat", height: "30" });
  assert.equal("customerId" in updated, false);
  assert.equal(updated.heightCm, null);
  assert.equal(toPetRequest({ ...DOG_VALUES, height: "" }), null);
  assert.equal(toPetRequest({ ...DOG_VALUES, weight: "0" }), null);
});

test("giá trị form từ hồ sơ: dùng dấu phẩy, trường trống thành chuỗi rỗng", () => {
  const [bap, muop] = createMockPets();
  assert.equal(toPetFormValues(bap).weight, "11");
  assert.equal(toPetFormValues(bap).height, "30");
  assert.equal(toPetFormValues(muop).height, "");
  assert.equal(toPetFormValues(muop).coatNote, "");
  assert.equal(toPetFormValues(createMockPets()[2]).weight, "1,8");
});

test("dữ liệu mô phỏng: nhóm kích cỡ khớp bảng mốc, mã thú cưng thuộc khách có thật", () => {
  const customerIds = new Set(createMockCustomers().map((customer) => customer.customerId));
  for (const pet of createMockPets()) {
    assert.ok(customerIds.has(pet.customerId), pet.name);
    assert.equal(getSizeGroup({ species: pet.species, weightKg: pet.weightKg, heightCm: pet.heightCm ?? null }), pet.sizeGroup, pet.name);
  }
  assert.equal(createMockCustomers().filter((customer) => customer.isBookingLocked).length, 1);
});

test("mock tìm khách: khớp một phần, bỏ dấu cách, không có thì rỗng, số đặc biệt báo mất mạng", async () => {
  resetMockCustomerStore();
  assert.deepEqual((await mockListCustomers("0962 345")).map((customer) => customer.fullName), ["Ngô Thanh Bình"]);
  assert.equal((await mockListCustomers("0988123456")).length, 0);
  assert.equal((await mockListCustomers("09")).length, 4);
  await assert.rejects(() => mockListCustomers(MOCK_NETWORK_ERROR_PHONE), (error) => error.kind === "network");
});

test("mock ghi nhận khách vãng lai: tạo được, tìm lại được, trùng số thì 409 DUPLICATE_CONTACT", async () => {
  resetMockCustomerStore();
  const { customerId } = await mockCreateWalkInCustomer({ fullName: " Phạm An ", phone: "0988 123 456" });
  assert.equal(customerId, "c2000000-0000-4000-8000-000000000005");
  const [found] = await mockListCustomers("0988123456");
  assert.equal(found.fullName, "Phạm An");
  assert.equal(found.isBookingLocked, false);
  await assert.rejects(
    () => mockCreateWalkInCustomer({ fullName: "Khác", phone: "0988123456" }),
    (error) => isDuplicateContactError(error),
  );
  await assert.rejects(() => mockCreateWalkInCustomer({ fullName: "X", phone: MOCK_NETWORK_ERROR_PHONE }), (error) => error.kind === "network");
});

test("mock hồ sơ thú cưng: tạo trả nhóm kích cỡ, liệt kê theo khách, sửa tính lại nhóm, 404 khi không có", async () => {
  resetMockCustomerStore();
  assert.equal((await mockListPets(MOCK_CUSTOMER_IDS.binh)).length, 3);
  assert.equal((await mockListPets(MOCK_CUSTOMER_IDS.linh)).length, 0);

  const request = toPetRequest({ ...DOG_VALUES, weight: "26", height: "40" }, MOCK_CUSTOMER_IDS.linh);
  const created = await mockCreatePet(request);
  assert.equal(created.sizeGroup, "Large");
  assert.equal(created.petId, "b2000000-0000-4000-8000-000000000006");
  assert.equal((await mockListPets(MOCK_CUSTOMER_IDS.linh)).length, 1);

  const pet = await mockGetPet(created.petId);
  assert.equal(pet.name, "Bắp");
  assert.equal(pet.customerId, MOCK_CUSTOMER_IDS.linh);

  const updated = await mockUpdatePet({ petId: created.petId, request: toPetRequest({ ...DOG_VALUES, weight: "8", height: "30" }) });
  assert.equal(updated.sizeGroup, "Small");
  assert.equal((await mockGetPet(created.petId)).sizeGroup, "Small");

  await assert.rejects(() => mockGetPet("khong-co"), (error) => isNotFoundError(error));
  await assert.rejects(() => mockCreatePet({ ...request, customerId: undefined }), (error) => error.status === 400);
  await assert.rejects(() => mockCreatePet({ ...request, weightKg: MOCK_WEIGHT_INVALID_REQUEST }), (error) => error.status === 400);
  await assert.rejects(() => mockCreatePet({ ...request, weightKg: MOCK_WEIGHT_NETWORK_ERROR }), (error) => error.kind === "network");
});

test("khách đang phục vụ: lưu và đọc lại đúng, bỏ trường thừa, dữ liệu hỏng thì null", () => {
  const raw = serializeServingCustomer({ customerId: "c1", fullName: "Ngô Thanh Bình", phone: "0962345118", isBookingLocked: false, email: "x@y.z" });
  assert.deepEqual(JSON.parse(raw), { customerId: "c1", fullName: "Ngô Thanh Bình", phone: "0962345118", isBookingLocked: false });
  assert.deepEqual(parseServingCustomer(raw), { customerId: "c1", fullName: "Ngô Thanh Bình", phone: "0962345118", isBookingLocked: false });
  assert.equal(parseServingCustomer(null), null);
  assert.equal(parseServingCustomer("không phải JSON"), null);
  assert.equal(parseServingCustomer("[]"), null);
  assert.equal(parseServingCustomer(JSON.stringify({ customerId: "c1", fullName: "A", phone: "0", isBookingLocked: "no" })), null);
  assert.equal(parseServingCustomer(JSON.stringify({ fullName: "A", phone: "0", isBookingLocked: false })), null);
});

const render = (element) => renderToStaticMarkup(element);
const registration = (name) => ({ name, onChange: async () => {}, onBlur: async () => {}, ref: () => {} });
const noop = () => {};
const [BINH, , MINH_ANH, HUNG] = createMockCustomers();
const MINH_ANH_PETS = createMockPets().filter((pet) => pet.customerId === MINH_ANH.customerId);

function walkInForm(props = {}) {
  return render(
    createElement(WalkInForm, {
      fullName: registration("fullName"),
      phone: registration("phone"),
      errors: {},
      submitError: null,
      isSubmitting: false,
      isDuplicate: false,
      onSubmit: noop,
      onCancel: noop,
      ...props,
    }),
  );
}

test("thẻ khách: tên, số điện thoại có dấu cách, email, thẻ tự đặt lịch và hai liên kết đi tiếp", () => {
  const html = render(createElement(CustomerCard, { customer: MINH_ANH, onSelect: noop }));
  assert.match(html, /<h2>Trần Minh Anh<\/h2>/);
  assert.match(html, /0903 412 678/);
  assert.match(html, /minhanh\.tran@gmail\.com/);
  assert.match(html, /Đang được tự đặt lịch/);
  assert.match(html, /href="\/khach-hang\/c2000000-0000-4000-8000-000000000003\/thu-cung\/them"[^>]*>[\s\S]*?Thêm thú cưng/);
  assert.match(html, /href="\/dat-lich\?customerId=c2000000-0000-4000-8000-000000000003"[^>]*>[\s\S]*?Đặt lịch thay/);
  assert.doesNotMatch(html, /Có tài khoản|vãng lai/);
});

test("thẻ khách: không có email thì không hiện dòng email; khách bị khóa hiện thẻ khóa; khối thú cưng nằm dưới", () => {
  const locked = render(createElement(CustomerCard, { customer: HUNG, onSelect: noop }));
  assert.match(locked, /Bị khóa tự đặt lịch/);
  assert.doesNotMatch(locked, /Đang được tự đặt lịch/);
  const noEmail = render(createElement(CustomerCard, { customer: BINH, onSelect: noop }, createElement("p", null, "Khối thú cưng")));
  assert.doesNotMatch(noEmail, /@/);
  assert.match(noEmail, /Khối thú cưng/);
});

test("khối thú cưng: mỗi thú cưng là liên kết sửa hồ sơ; chưa có thì báo chưa có hồ sơ", () => {
  const html = render(createElement(CustomerPetList, { customerId: MINH_ANH.customerId, pets: MINH_ANH_PETS, onSelect: noop }));
  assert.match(html, /href="\/khach-hang\/c2000000-0000-4000-8000-000000000003\/thu-cung\/b2000000-0000-4000-8000-000000000004"/);
  assert.match(html, />Bông</);
  assert.match(html, /Chó Poodle, 9,0 kg, nhóm Nhỏ/);
  assert.match(html, /Mèo Anh lông ngắn, 4,2 kg, nhóm Vừa/);
  const empty = render(createElement(CustomerPetList, { customerId: MINH_ANH.customerId, pets: [], onSelect: noop }));
  assert.match(empty, /Khách chưa có hồ sơ thú cưng\./);
  assert.doesNotMatch(empty, /<ul/);
});

test("ô tìm khách: có nhãn ẩn, biểu tượng tìm kiếm, nút Tìm khách; lỗi gắn aria-describedby", () => {
  const html = render(createElement(CustomerSearchForm, { registration: registration("search"), isSearching: false, onSubmit: noop }));
  assert.match(html, /<form[^>]*role="search"/);
  assert.match(html, /<label[^>]*class="sr-only"[^>]*>Số điện thoại khách hàng<\/label>/);
  assert.match(html, /pl-\[38px\]/);
  assert.match(html, />Tìm khách<\/button>/);
  assert.doesNotMatch(html, /aria-invalid/);

  const invalid = render(
    createElement(CustomerSearchForm, { registration: registration("search"), error: "Vui lòng nhập số điện thoại.", isSearching: false, onSubmit: noop }),
  );
  assert.match(invalid, /aria-invalid="true"/);
  assert.match(invalid, /aria-describedby="customer-search-error"/);
  assert.match(invalid, /Vui lòng nhập số điện thoại\./);

  const busy = render(createElement(CustomerSearchForm, { registration: registration("search"), isSearching: true, onSubmit: noop }));
  assert.match(busy, /Đang tìm…/);
});

test("form khách vãng lai: hai ô bắt buộc, ghi chú, nút lưu mở được", () => {
  const html = walkInForm();
  assert.match(html, /Ghi nhận khách vãng lai/);
  assert.match(html, /<label[^>]*for="walk-in-name"[^>]*>Họ tên/);
  assert.match(html, /<label[^>]*for="walk-in-phone"[^>]*>Số điện thoại/);
  assert.match(html, /Khách vãng lai không có tài khoản đăng nhập và không nhận thông báo trên web\./);
  assert.match(html, />Hủy bỏ<\/button>/);
  assert.match(html, /Lưu và tạo hồ sơ thú cưng/);
  assert.doesNotMatch(html, /<button[^>]*type="submit"[^>]*\sdisabled=""/);
  assert.doesNotMatch(html, /Chọn khách này/);
});

test("form khách vãng lai: trùng liên hệ thì hiện thẻ khách trùng và khóa nút lưu; lỗi chung hiện ở đầu form", () => {
  const duplicate = walkInForm({
    isDuplicate: true,
    errors: { phone: "Thông tin liên hệ đã có, vui lòng chọn khách hàng hiện có." },
    duplicate: createElement(DuplicateCustomerCard, { customer: BINH, onSelect: noop }),
  });
  assert.match(duplicate, /Thông tin liên hệ đã có, vui lòng chọn khách hàng hiện có\./);
  assert.match(duplicate, /aria-invalid="true"/);
  assert.match(duplicate, /Ngô Thanh Bình/);
  assert.match(duplicate, /0962 345 118/);
  assert.match(duplicate, /Chọn khách này/);
  assert.match(duplicate, /<button[^>]*type="submit"[^>]*\sdisabled=""/);

  const failed = walkInForm({ submitError: new ApiError({ kind: "network" }) });
  assert.match(failed, /role="alert"[\s\S]*Không kết nối được máy chủ, vui lòng thử lại\./);
});

const fakeRegister = (name) => ({ name, onChange: async () => {}, onBlur: async () => {}, ref: () => {} });

function petFields(props = {}) {
  return render(
    createElement(PetFormFields, {
      register: fakeRegister,
      errors: {},
      species: "Dog",
      temperament: "Normal",
      isEditing: false,
      onSpeciesChange: noop,
      onTemperamentChange: noop,
      ...props,
    }),
  );
}

test("đường dẫn và dải khách đang phục vụ", () => {
  const crumb = render(createElement(CustomerBreadcrumb, { customerName: "Ngô Thanh Bình", current: "Thêm thú cưng" }));
  assert.match(crumb, /<nav[^>]*aria-label="Đường dẫn"/);
  assert.match(crumb, /href="\/khach-hang"[^>]*>Khách hàng<\/a>/);
  assert.match(crumb, />Ngô Thanh Bình<\/span>/);
  assert.match(crumb, /<span aria-current="page">Thêm thú cưng<\/span>/);

  const strip = render(createElement(ServingCustomerStrip, { customer: BINH }));
  assert.match(strip, /<strong>Ngô Thanh Bình<\/strong>/);
  assert.match(strip, /0962 345 118/);
  assert.doesNotMatch(strip, /vãng lai|Có tài khoản/);
});

test("trường form thú cưng khi tạo: chó là mặc định, chiều cao bắt buộc, cảnh báo khó tính chưa hiện", () => {
  const html = petFields();
  for (const label of ["Chó", "Mèo", "Thỏ", "Chuột lang"]) assert.match(html, new RegExp(`>${label}<`));
  assert.match(html, /<label[^>]*for="pet-name"[^>]*>Tên/);
  assert.match(html, /<label[^>]*for="pet-breed"[^>]*>Giống/);
  assert.match(html, /Cân nặng \(kg\)/);
  assert.match(html, /Chiều cao vai \(cm\)/);
  assert.match(html, /Bắt buộc với chó, đo từ mặt đất tới vai\./);
  assert.match(html, /Hiền|Điềm tĩnh|Bình thường/);
  assert.match(html, /\(không bắt buộc\)/);
  assert.match(html, /tiền sử bệnh, lưu ý chăm sóc/);
  assert.doesNotMatch(html, /Hãy báo khách điều này khi chọn giờ/);
  assert.doesNotMatch(html, /Cân nặng thực tế khi tiếp nhận/);
  assert.doesNotMatch(html, /data-tone="warn"/);
});

test("trường form thú cưng: tính cách khó tính hiện cảnh báo; loài khác chó khóa ô chiều cao; sửa hồ sơ có ghi chú cân nặng", () => {
  const difficult = petFields({ temperament: "Difficult" });
  assert.match(difficult, /data-tone="warn"/);
  assert.match(difficult, /Hãy báo khách điều này khi chọn giờ\./);

  const cat = petFields({ species: "Cat" });
  assert.match(cat, /chỉ cần với chó/);
  assert.match(cat, /<input[^>]*id="pet-height"[^>]*disabled=""/);
  assert.doesNotMatch(cat, /Bắt buộc với chó, đo từ mặt đất tới vai\./);

  const editing = petFields({ isEditing: true });
  assert.match(editing, /Cân nặng thực tế khi tiếp nhận sẽ cập nhật vào đây\./);
  assert.match(editing, /aria-describedby="pet-weight-hint"/);

  const invalid = petFields({ errors: { name: { type: "validate", message: "Vui lòng nhập tên thú cưng." } } });
  assert.match(invalid, /aria-invalid="true"/);
  assert.match(invalid, /Vui lòng nhập tên thú cưng\./);
});

test("thẻ nhóm kích cỡ dự kiến: đủ dữ liệu thì hiện nhóm và căn cứ, chưa đủ thì nhắc nhập; luôn ghi nhóm chính thức do hệ thống xác định", () => {
  const ready = render(createElement(SizeEstimateCard, { species: "Dog", estimate: estimateSize({ species: "Dog", weightKg: 11, heightCm: 30 }) }));
  assert.match(ready, /Nhóm kích cỡ dự kiến/);
  assert.match(ready, />Vừa</);
  assert.match(ready, /Theo cân nặng 11 kg/);
  assert.match(ready, /Theo chiều cao 30 cm/);
  assert.match(ready, /Lấy nhóm cao hơn/);
  assert.match(ready, /Nhóm chính thức do hệ thống xác định khi lưu/);
  assert.match(ready, /Chỉ khách hàng mới gỡ được hồ sơ thú cưng\./);

  const incomplete = render(createElement(SizeEstimateCard, { species: "Dog", estimate: estimateSize({ species: "Dog", weightKg: 11, heightCm: null }) }));
  assert.match(incomplete, /Chưa đủ dữ liệu/);
  assert.match(incomplete, /Nhập cân nặng và chiều cao để xem nhóm dự kiến\./);
  const cat = render(createElement(SizeEstimateCard, { species: "Cat", estimate: { status: "incomplete" } }));
  assert.match(cat, /Nhập cân nặng để xem nhóm dự kiến\./);
});

