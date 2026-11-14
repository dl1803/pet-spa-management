import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerCard } from "../features/reception-customers/components/customer-card.tsx";
import { CustomerPetList } from "../features/reception-customers/components/customer-pet-list.tsx";
import { CustomerSearchForm } from "../features/reception-customers/components/customer-search-form.tsx";
import { DuplicateCustomerCard } from "../features/reception-customers/components/duplicate-customer-card.tsx";
import { RecentAppointmentsList } from "../features/reception-customers/components/recent-appointments-list.tsx";
import { WalkInForm } from "../features/reception-customers/components/walk-in-form.tsx";
import { CustomerBreadcrumb } from "../features/reception-customers/components/customer-breadcrumb.tsx";
import { PetFormFields } from "../features/reception-customers/components/pet-form-fields.tsx";
import { ServingCustomerStrip } from "../features/reception-customers/components/serving-customer-strip.tsx";
import { SizeEstimateCard } from "../features/reception-customers/components/size-estimate-card.tsx";
import { WalkInDuplicatePanel } from "../features/reception-customers/components/walk-in-section.tsx";
import {
  PetNotFoundState,
  PetProfileBlockedState,
  PetProfileFallback,
} from "../features/reception-customers/screens/pet-profile-screen.tsx";
import {
  describePet,
  describeTruncatedCustomers,
  getInitials,
  isDuplicateContactError,
  isNotFoundError,
  isPetEditableFor,
  parseDecimal,
  PET_FORM_DEFAULT_VALUES,
  toPetFormValues,
  toPetRequest,
  toWalkInRequest,
  validateCoatNote,
  validatePetBreed,
  validatePetHeight,
  validatePetName,
  validatePetNotes,
  validatePetWeight,
  validateSearchTerm,
} from "../features/reception-customers/forms.ts";
import {
  createMockCustomers,
  createMockPets,
  createMockRecentAppointments,
  MOCK_CUSTOMER_IDS,
} from "../features/reception-customers/mock-data.ts";
import {
  mockListRecentAppointments,
  resetMockCustomerStore,
} from "../features/reception-customers/mock-api.ts";
import { ApiError } from "../lib/api/errors.ts";
import {
  parseServingCustomer,
  serializeServingCustomer,
  ServingCustomerProvider,
  useServingCustomer,
} from "../lib/serving-customer.tsx";
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
  assert.equal(getInitials("An"), "A");
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

test("thông báo cắt kết quả tìm khách: chỉ hiện khi còn khách chưa hiển thị", () => {
  assert.equal(describeTruncatedCustomers(1, 1), null);
  assert.equal(describeTruncatedCustomers(20, 20), null);
  assert.equal(
    describeTruncatedCustomers(37, 20),
    "Có 37 khách khớp, đang hiển thị 20 khách đầu tiên theo họ tên. Nhập thêm chữ số để thu hẹp kết quả.",
  );
});

test("hồ sơ chỉ sửa được khi còn hoạt động và thuộc đúng khách đang phục vụ", () => {
  const pet = createMockPets()[0];
  assert.equal(isPetEditableFor(pet, pet.customerId), true);
  assert.equal(isPetEditableFor(pet, "khach-khac"), false);
  assert.equal(isPetEditableFor({ ...pet, isActive: false }, pet.customerId), false);
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

test("luật nhập liệu thú cưng mở rộng: tên, giống, đặc điểm lông, ghi chú, chiều cao cận trên, dấu chấm và request có ghi chú", () => {
  assert.equal(parseDecimal("9.5"), 9.5);
  assert.equal(validatePetName("  "), "Vui lòng nhập tên thú cưng.");
  assert.equal(validatePetName("a".repeat(101)), "Tên tối đa 100 ký tự.");
  assert.equal(validatePetName("Bông"), true);
  assert.equal(validatePetBreed("  "), "Vui lòng nhập giống.");
  assert.equal(validatePetBreed("a".repeat(101)), "Giống tối đa 100 ký tự.");
  assert.equal(validatePetBreed("Corgi"), true);
  assert.equal(validateCoatNote("a".repeat(256)), "Đặc điểm lông tối đa 255 ký tự.");
  assert.equal(validateCoatNote("Lông trắng"), true);
  assert.equal(validatePetNotes("a".repeat(1001)), "Ghi chú tối đa 1000 ký tự.");
  assert.equal(validatePetNotes("Sợ tiếng máy sấy"), true);
  assert.equal(validatePetHeight("151", DOG_VALUES), "Chiều cao tối đa 150 cm.");

  const withNotes = toPetRequest({
    ...DOG_VALUES,
    coatNote: " Lông vàng trắng ",
    notes: " Đã tiêm dại ",
  });
  assert.equal(withNotes?.coatNote, "Lông vàng trắng");
  assert.equal(withNotes?.notes, "Đã tiêm dại");
});

test("khách đang phục vụ: customerId rỗng thì null và Provider render an toàn ở SSR", () => {
  assert.equal(
    parseServingCustomer(JSON.stringify({ customerId: "", fullName: "A", phone: "0962345118", isBookingLocked: false })),
    null,
  );
  function Probe() {
    const { isReady, customer } = useServingCustomer();
    return createElement("span", null, `${String(isReady)}:${String(customer)}`);
  }
  const html = render(createElement(ServingCustomerProvider, null, createElement(Probe)));
  assert.equal(html, "<span>false:null</span>");
});

test("tìm khách trùng khi ghi nhận vãng lai: đủ trạng thái tải, lỗi kèm thử lại, thẻ khách và dự phòng rỗng", () => {
  const pending = render(
    createElement(WalkInDuplicatePanel, {
      duplicatePhone: "0962345118",
      isPending: true,
      isFetching: false,
      error: null,
      customer: undefined,
      onSelect: noop,
      onRetry: noop,
    }),
  );
  assert.match(pending, /role="status"[^>]*aria-label="Đang tìm thông tin khách trùng"/);

  const failed = render(
    createElement(WalkInDuplicatePanel, {
      duplicatePhone: "0962345118",
      isPending: false,
      isFetching: false,
      error: new ApiError({ kind: "network" }),
      customer: undefined,
      onSelect: noop,
      onRetry: noop,
    }),
  );
  assert.match(failed, /role="alert"[\s\S]*Không kết nối được máy chủ/);
  assert.match(failed, />Thử lại<\/button>/);

  const found = render(
    createElement(WalkInDuplicatePanel, {
      duplicatePhone: "0962345118",
      isPending: false,
      isFetching: false,
      error: null,
      customer: BINH,
      onSelect: noop,
      onRetry: noop,
    }),
  );
  assert.match(found, /Ngô Thanh Bình/);
  assert.match(found, /Chọn khách này/);

  const missing = render(
    createElement(WalkInDuplicatePanel, {
      duplicatePhone: "0962345118",
      isPending: false,
      isFetching: false,
      error: null,
      customer: undefined,
      onSelect: noop,
      onRetry: noop,
    }),
  );
  assert.match(missing, /Không tải được thẻ khách với số[\s\S]*0962 345 118/);
});

test("trạng thái chặn và tải/lỗi ở màn Hồ sơ thú cưng: giữ PageHeader h1, phân biệt chưa chọn và lệch khách, giữ ngữ cảnh tìm kiếm", () => {
  const crumbWithSearch = render(
    createElement(CustomerBreadcrumb, {
      customerName: "Ngô Thanh Bình",
      current: "Bắp",
      customersHref: "/khach-hang?search=0962345118",
    }),
  );
  assert.match(crumbWithSearch, /href="\/khach-hang\?search=0962345118"/);

  const noCustomer = render(createElement(PetProfileBlockedState, { isEditing: true, servingCustomer: null }));
  assert.match(noCustomer, /<h1>Sửa hồ sơ thú cưng<\/h1>/);
  assert.match(noCustomer, /<h2>Chưa chọn khách hàng<\/h2>/);
  assert.match(noCustomer, /href="\/khach-hang"[^>]*>Tìm khách<\/a>/);

  const mismatch = render(createElement(PetProfileBlockedState, { isEditing: false, servingCustomer: BINH }));
  assert.match(mismatch, /<h1>Tạo hồ sơ thú cưng<\/h1>/);
  assert.match(mismatch, /<h2>Không khớp khách đang phục vụ<\/h2>/);
  assert.match(mismatch, /Ngô Thanh Bình/);

  const loading = render(
    createElement(PetProfileFallback, {
      error: null,
      isFetching: false,
      backHref: "/khach-hang?search=0962345118",
      onRetry: noop,
    }),
  );
  assert.match(loading, /role="status"[^>]*aria-label="Đang tải hồ sơ thú cưng"/);

  const forbidden = render(
    createElement(PetProfileFallback, {
      error: new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" }),
      isFetching: false,
      backHref: "/khach-hang",
      onRetry: noop,
    }),
  );
  assert.match(forbidden, /Bạn không có quyền xem trang này/);

  const notFound = render(
    createElement(PetProfileFallback, {
      error: new ApiError({ kind: "http", status: 404, code: "NOT_FOUND" }),
      isFetching: false,
      backHref: "/khach-hang?search=0962345118",
      onRetry: noop,
    }),
  );
  assert.match(notFound, /Không tìm thấy thú cưng/);
  assert.match(notFound, /href="\/khach-hang\?search=0962345118"[^>]*>Về danh sách khách hàng<\/a>/);

  const networkFail = render(
    createElement(PetProfileFallback, {
      error: new ApiError({ kind: "network" }),
      isFetching: false,
      backHref: "/khach-hang",
      onRetry: noop,
    }),
  );
  assert.match(networkFail, /role="alert"[\s\S]*Không kết nối được máy chủ/);
  assert.match(networkFail, />Thử lại<\/button>/);

  const standaloneNotFound = render(createElement(PetNotFoundState, {}));
  assert.match(standaloneNotFound, /href="\/khach-hang"/);
});

test("khối Lịch hẹn gần đây của SW-04: hiển thị danh sách phiếu rút gọn và trạng thái rỗng", async () => {
  resetMockCustomerStore();
  assert.equal(createMockRecentAppointments().length, 3);

  const minhAnhAppts = await mockListRecentAppointments(MOCK_CUSTOMER_IDS.minhAnh);
  assert.equal(minhAnhAppts.length, 2);
  assert.equal(minhAnhAppts[0].petName, "Mochi");
  assert.equal(minhAnhAppts[0].status, "Pending");
  assert.equal(minhAnhAppts[1].petName, "Bông");
  assert.equal(minhAnhAppts[1].status, "Confirmed");

  const noAppts = await mockListRecentAppointments(MOCK_CUSTOMER_IDS.linh);
  assert.equal(noAppts.length, 0);

  const renderedList = render(
    createElement(RecentAppointmentsList, {
      customerId: MOCK_CUSTOMER_IDS.minhAnh,
      appointments: minhAnhAppts,
    }),
  );
  assert.match(renderedList, /<h3[^>]*>Lịch hẹn gần đây<\/h3>/);
  assert.match(renderedList, /14:00[\s\S]*06\/10/);
  assert.match(renderedList, /Mochi, spa/);
  assert.match(renderedList, /Chờ xác nhận/);
  assert.match(renderedList, /09:00[\s\S]*06\/10/);
  assert.match(renderedList, /Bông, spa/);
  assert.match(renderedList, /Đã xác nhận/);
  assert.match(renderedList, /Tắm &amp; sấy lông, Cắt tỉa lông/);
  assert.ok(!renderedList.includes("text-foreground"));
  assert.match(renderedList, /text-ink/);
  assert.match(renderedList, /bg-lagoon-25/);

  const renderedEmpty = render(
    createElement(RecentAppointmentsList, {
      customerId: MOCK_CUSTOMER_IDS.linh,
      appointments: [],
    }),
  );
  assert.match(renderedEmpty, /Chưa có lịch hẹn nào gần đây\./);
});


