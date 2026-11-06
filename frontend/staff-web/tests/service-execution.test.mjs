import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PHOTO_BYTES,
  PHOTO_ERROR_NOT_IMAGE,
  PHOTO_ERROR_TOO_LARGE,
  START_BLOCKED_COST_PENDING,
  START_BLOCKED_NO_PHOTO,
  countServices,
  endSentence,
  formatPhotoTime,
  getExecutionFlags,
  getRemainingSeconds,
  getStartBlockers,
  pickLatestPhoto,
  validatePhotoFile,
} from "../features/service-execution/execution.ts";
import { withPhoto, withServiceDone, withStarted } from "../features/service-execution/local-updates.ts";
import { MOCK_APPOINTMENT_IDS, createMockCompletedExecutions, createMockExecutions, findMockExecution } from "../features/service-execution/mock-data.ts";
import { MOCK_WORK_HISTORY } from "../features/work-history/mock-data.ts";
import { formatCountdown, formatWeight } from "../lib/format.ts";

const NOW = new Date("2026-11-06T02:00:00Z"); // 09:00 ngày 06/11/2026 ở cửa hàng
const TODAY = "2026-11-06";
const mocks = () => createMockExecutions(NOW);
const byId = (id) => findMockExecution(mocks(), id);
const photo = (kind, uploadedAt, photoId = `p-${kind}-${uploadedAt}`) => ({ photoId, kind, url: "blob:x", uploadedAt });

test("lịch hoàn tất mô phỏng khớp từng dòng Lịch sử công việc (nút “Xem” không về 404)", () => {
  const completed = createMockCompletedExecutions();
  assert.equal(completed.length, MOCK_WORK_HISTORY.length);
  const liveIds = new Set(mocks().map((entry) => entry.appointment.appointmentId));
  for (const { appointment: expected, species } of MOCK_WORK_HISTORY) {
    const entry = findMockExecution(completed, expected.appointmentId);
    assert.ok(entry, `thiếu lịch ${expected.appointmentId}`);
    assert.ok(!liveIds.has(expected.appointmentId));
    const { appointment, pet, photos } = entry;
    assert.deepEqual(
      [appointment.status, appointment.type, appointment.petId, appointment.petName, appointment.slotStart, appointment.slotEnd],
      ["Completed", "Spa", expected.petId, expected.petName, expected.slotStart, expected.slotEnd],
    );
    assert.deepEqual([pet.petId, pet.name, pet.species], [expected.petId, expected.petName, species]);
    assert.deepEqual(
      appointment.services.map((service) => [service.serviceId, service.name]),
      expected.services.map((service) => [service.serviceId, service.name]),
    );
    assert.ok(appointment.services.every((service) => service.isDone));
    assert.equal(appointment.pendingCostConfirmation ?? null, null);
    assert.ok(pickLatestPhoto(photos, "Before") !== null && pickLatestPhoto(photos, "After") !== null);
  }
});

test("dữ liệu mô phỏng: 3 lịch hẹn mã khác nhau, trạng thái Received, Received, InProgress", () => {
  const entries = mocks();
  assert.deepEqual(entries.map((entry) => entry.appointment.status), ["Received", "Received", "InProgress"]);
  assert.equal(new Set(entries.map((entry) => entry.appointment.appointmentId)).size, 3);
  assert.equal(new Set(entries.map((entry) => entry.appointment.appointmentId.slice(0, 8))).size, 3);
  assert.ok(entries.every((entry) => entry.appointment.type === "Spa" && entry.appointment.petId === entry.pet.petId));
  assert.equal(findMockExecution(entries, "khong-co"), null);
  assert.equal(findMockExecution(entries, undefined), null);
});

test("thao tác cho phép theo trạng thái", () => {
  assert.deepEqual(getExecutionFlags("Received"), { canUploadBefore: true, canStart: true, canUploadAfter: false, canMarkDone: false });
  assert.deepEqual(getExecutionFlags("InProgress"), { canUploadBefore: false, canStart: false, canUploadAfter: true, canMarkDone: true });
  for (const status of ["Pending", "Confirmed", "InStay", "Completed", "Cancelled"]) {
    assert.ok(Object.values(getExecutionFlags(status)).every((value) => value === false), status);
  }
});

test("lý do khóa nút bắt đầu: thiếu ảnh trước, chờ xác nhận chi phí, cả hai, không có", () => {
  assert.deepEqual(getStartBlockers(byId(MOCK_APPOINTMENT_IDS.blocked)), [START_BLOCKED_NO_PHOTO, START_BLOCKED_COST_PENDING]);
  assert.deepEqual(getStartBlockers(byId(MOCK_APPOINTMENT_IDS.ready)), []);
  const onlyPhotoMissing = { ...byId(MOCK_APPOINTMENT_IDS.ready), photos: [] };
  assert.deepEqual(getStartBlockers(onlyPhotoMissing), [START_BLOCKED_NO_PHOTO]);
  const afterOnly = { ...onlyPhotoMissing, photos: [photo("After", "2026-11-06T03:00:00Z")] };
  assert.deepEqual(getStartBlockers(afterOnly), [START_BLOCKED_NO_PHOTO]);
});

test("ảnh mới nhất theo loại; không có thì null", () => {
  const photos = [photo("Before", "2026-11-06T01:00:00Z", "a"), photo("Before", "2026-11-06T02:00:00Z", "b"), photo("After", "2026-11-06T01:30:00Z", "c")];
  assert.equal(pickLatestPhoto(photos, "Before")?.photoId, "b");
  assert.equal(pickLatestPhoto(photos, "After")?.photoId, "c");
  assert.equal(pickLatestPhoto([], "Before"), null);
});

test("đếm dịch vụ xong, lịch không có dịch vụ thì 0 / 0", () => {
  assert.deepEqual(countServices(byId(MOCK_APPOINTMENT_IDS.inProgress).appointment), { done: 1, total: 2 });
  assert.deepEqual(countServices(byId(MOCK_APPOINTMENT_IDS.blocked).appointment), { done: 0, total: 2 });
  assert.deepEqual(countServices({ ...byId(MOCK_APPOINTMENT_IDS.blocked).appointment, services: undefined }), { done: 0, total: 0 });
});

test("kiểm tra tệp ảnh: chỉ image/*, tối đa 50 MB", () => {
  assert.equal(validatePhotoFile({ type: "image/jpeg", size: 1024 }), null);
  assert.equal(validatePhotoFile({ type: "image/png", size: MAX_PHOTO_BYTES }), null);
  assert.equal(validatePhotoFile({ type: "application/pdf", size: 1024 }), PHOTO_ERROR_NOT_IMAGE);
  assert.equal(validatePhotoFile({ type: "", size: 1024 }), PHOTO_ERROR_NOT_IMAGE);
  assert.equal(validatePhotoFile({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 }), PHOTO_ERROR_TOO_LARGE);
  assert.equal(PHOTO_ERROR_NOT_IMAGE, "Chỉ chấp nhận tệp ảnh.");
});

test("đồng hồ đếm ngược và định dạng", () => {
  assert.equal(getRemainingSeconds("2026-11-06T02:30:00Z", Date.parse("2026-11-06T02:00:00Z")), 1800);
  assert.equal(getRemainingSeconds("2026-11-06T02:30:00Z", Date.parse("2026-11-06T02:29:59.200Z")), 1);
  assert.equal(getRemainingSeconds("2026-11-06T02:30:00Z", Date.parse("2026-11-06T02:31:00Z")), 0);
  assert.equal(formatCountdown(1622), "27:02");
  assert.equal(formatCountdown(0), "00:00");
  assert.equal(formatCountdown(-5), "00:00");
  assert.equal(formatCountdown(59), "00:59");
  assert.equal(formatWeight(11.2), "11,2 kg");
  assert.equal(formatWeight(9), "9,0 kg");
});

test("thời gian trên ảnh và câu có dấu chấm cuối", () => {
  assert.equal(formatPhotoTime("2026-11-06T02:10:00Z", TODAY), "09:10 hôm nay");
  assert.equal(formatPhotoTime("2026-11-05T09:10:00Z", TODAY), "Hôm qua, 16:10");
  assert.equal(formatPhotoTime("2026-11-01T01:30:00Z", TODAY), "01/11, 08:30");
  assert.equal(endSentence("dị ứng nhẹ"), "dị ứng nhẹ.");
  assert.equal(endSentence("  đã có dấu chấm.  "), "đã có dấu chấm.");
  assert.equal(endSentence("hơi sợ máy sấy!"), "hơi sợ máy sấy!");
});

test("cập nhật cục bộ: thêm ảnh đúng trạng thái, không sửa dữ liệu gốc", () => {
  const received = byId(MOCK_APPOINTMENT_IDS.blocked);
  const before = photo("Before", "2026-11-06T02:00:00Z", "new-before");
  const next = withPhoto(received, before);
  assert.equal(next.photos.length, 1);
  assert.equal(received.photos.length, 0);
  assert.equal(withPhoto(received, photo("After", "2026-11-06T02:00:00Z")), received);
  const inProgress = byId(MOCK_APPOINTMENT_IDS.inProgress);
  assert.equal(withPhoto(inProgress, before), inProgress);
  assert.equal(withPhoto(inProgress, photo("After", "2026-11-06T08:00:00Z")).photos.length, 2);
});

test("cập nhật cục bộ: bắt đầu chỉ khi Received và hết lý do khóa", () => {
  const blocked = byId(MOCK_APPOINTMENT_IDS.blocked);
  assert.equal(withStarted(blocked), blocked);
  const ready = byId(MOCK_APPOINTMENT_IDS.ready);
  assert.equal(withStarted(ready).appointment.status, "InProgress");
  assert.equal(ready.appointment.status, "Received");
  const inProgress = byId(MOCK_APPOINTMENT_IDS.inProgress);
  assert.equal(withStarted(inProgress), inProgress);
});

test("cập nhật cục bộ: đánh dấu xong cần InProgress, cắt ghi chú, ghi chú rỗng thành null, không đánh dấu lại", () => {
  const inProgress = byId(MOCK_APPOINTMENT_IDS.inProgress);
  const trim = inProgress.appointment.services[1];
  const done = withServiceDone(inProgress, trim.serviceId, "  Tỉa kiểu teddy.  ", "2026-11-06T06:00:00Z");
  const updated = done.appointment.services[1];
  assert.deepEqual([updated.isDone, updated.note, updated.doneAt], [true, "Tỉa kiểu teddy.", "2026-11-06T06:00:00Z"]);
  assert.equal(trim.isDone, false);
  assert.equal(withServiceDone(done, trim.serviceId, "x", "2026-11-06T07:00:00Z"), done);
  assert.equal(withServiceDone(inProgress, "khong-co", "", "2026-11-06T07:00:00Z"), inProgress);
  assert.equal(withServiceDone(inProgress, trim.serviceId, "   ", "2026-11-06T07:00:00Z").appointment.services[1].note, null);
  const ready = byId(MOCK_APPOINTMENT_IDS.ready);
  assert.equal(withServiceDone(ready, ready.appointment.services[0].serviceId, "", "2026-11-06T07:00:00Z"), ready);
});
