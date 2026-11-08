import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, ERROR_CODES } from "../lib/api/errors.ts";
import {
  COMPLETE_BLOCKED_REASON,
  MAX_PHOTO_BYTES,
  PHOTO_ERROR_NOT_IMAGE,
  PHOTO_ERROR_TOO_LARGE,
  START_BLOCKED_COST_PENDING,
  START_BLOCKED_NO_PHOTO,
  countServices,
  endSentence,
  formatPhotoTime,
  getCompleteBlockers,
  getCompleteFeedback,
  getExecutionFlags,
  getRemainingSeconds,
  getStartBlockers,
  pickLatestPhoto,
  validatePhotoFile,
} from "../features/service-execution/execution.ts";
import { completeLocally, withPhoto, withServiceDone, withStarted } from "../features/service-execution/local-updates.ts";
import { MOCK_APPOINTMENT_IDS, createMockCompletedExecutions, createMockExecutions, findMockExecution } from "../features/service-execution/mock-data.ts";
import { createPhotoUrlTracker } from "../features/service-execution/photo-urls.ts";
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
  assert.deepEqual(getExecutionFlags("Received"), { canUploadBefore: true, canStart: true, canUploadAfter: false, canMarkDone: false, canComplete: false });
  assert.deepEqual(getExecutionFlags("InProgress"), { canUploadBefore: false, canStart: false, canUploadAfter: true, canMarkDone: true, canComplete: true });
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

test("theo dõi URL ảnh xem trước: thu hồi URL cũ cùng loại, giữ loại khác, thu hồi hết khi rời màn", () => {
  const revoked = [];
  const tracker = createPhotoUrlTracker((url) => revoked.push(url));
  tracker.replace("Before", "blob:b1");
  tracker.replace("After", "blob:a1");
  assert.deepEqual(revoked, []);
  tracker.replace("Before", "blob:b2");
  assert.deepEqual(revoked, ["blob:b1"]);
  tracker.replace("Before", "blob:b2"); // cùng URL: không thu hồi
  assert.deepEqual(revoked, ["blob:b1"]);
  tracker.revokeAll();
  assert.deepEqual([...revoked].sort(), ["blob:a1", "blob:b1", "blob:b2"]);
  tracker.revokeAll(); // gọi lại không thu hồi lần nữa
  assert.equal(revoked.length, 3);
});

test("đổi ảnh: ảnh vừa chọn luôn là ảnh được hiển thị, kể cả khi timestamp bằng hoặc sớm hơn ảnh cũ", () => {
  const timestamp = "2026-11-06T02:01:00.000Z";
  const cases = [
    { kind: "Before", otherKind: "After", id: MOCK_APPOINTMENT_IDS.ready },
    { kind: "After", otherKind: "Before", id: MOCK_APPOINTMENT_IDS.inProgress },
  ];

  for (const { kind, otherKind, id } of cases) {
    const old = { ...photo(kind, timestamp, "old-photo"), url: "blob:old" };
    const other = { ...photo(otherKind, timestamp, "other-photo"), url: "blob:other" };
    const data = { ...byId(id), photos: [old, other] };

    for (const uploadedAt of [timestamp, "2026-11-06T02:00:59.999Z"]) {
      const replacement = { ...photo(kind, uploadedAt, "new-photo"), url: "blob:new" };
      const next = withPhoto(data, replacement);

      assert.equal(pickLatestPhoto(next.photos, kind)?.url, replacement.url);
      assert.ok(!next.photos.includes(old));
      assert.equal(pickLatestPhoto(next.photos, otherKind), other);
    }
  }
});

test("đổi ảnh: URL tracker thu hồi không bao giờ là URL đang được hiển thị", () => {
  const revoked = [];
  const tracker = createPhotoUrlTracker((url) => revoked.push(url));
  let data = byId(MOCK_APPOINTMENT_IDS.ready);
  const uploads = [
    { ...photo("Before", "2026-11-06T02:01:00.000Z", "first-photo"), url: "blob:first" },
    { ...photo("Before", "2026-11-06T02:00:59.999Z", "second-photo"), url: "blob:second" },
  ];

  for (const upload of uploads) {
    data = withPhoto(data, upload);
    tracker.replace(upload.kind, upload.url);
    const displayed = pickLatestPhoto(data.photos, upload.kind);
    assert.ok(displayed);
    assert.ok(!revoked.includes(displayed.url));
  }

  assert.deepEqual(revoked, ["blob:first"]);
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

// Lịch đang thực hiện đủ điều kiện hoàn tất: mọi dịch vụ xong và có ảnh sau.
function readyToComplete() {
  const base = byId(MOCK_APPOINTMENT_IDS.inProgress);
  const services = base.appointment.services.map((service) => ({ ...service, isDone: true, doneAt: "2026-11-06T06:00:00Z" }));
  return { ...base, appointment: { ...base.appointment, services }, photos: [...base.photos, photo("After", "2026-11-06T06:05:00Z")] };
}

test("lý do khóa nút hoàn tất: còn dịch vụ chưa xong hoặc chưa có ảnh sau", () => {
  const ready = readyToComplete();
  assert.deepEqual(getCompleteBlockers(ready), []);
  assert.deepEqual(getCompleteBlockers(byId(MOCK_APPOINTMENT_IDS.inProgress)), [COMPLETE_BLOCKED_REASON]); // 1/2 xong, chưa có ảnh sau
  assert.deepEqual(getCompleteBlockers({ ...ready, photos: ready.photos.filter((entry) => entry.kind !== "After") }), [COMPLETE_BLOCKED_REASON]);
  const pendingService = { ...ready.appointment, services: [{ ...ready.appointment.services[0], isDone: false }, ready.appointment.services[1]] };
  assert.deepEqual(getCompleteBlockers({ ...ready, appointment: pendingService }), [COMPLETE_BLOCKED_REASON]);
  assert.equal(COMPLETE_BLOCKED_REASON, "Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc.");
  for (const services of [[], undefined]) {
    assert.deepEqual(getCompleteBlockers({ ...ready, appointment: { ...ready.appointment, services } }), [COMPLETE_BLOCKED_REASON]);
  }
});

test("phản hồi lỗi hoàn tất: 409 ảnh và dịch vụ cho lý do dưới nút, 403 và lỗi khác hiển thị tại chỗ", () => {
  const http = (status, code) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail: "Chi tiết" });
  assert.deepEqual(getCompleteFeedback(http(409, "PHOTO_REQUIRED")), { kind: "reason", reason: COMPLETE_BLOCKED_REASON, highlightAfterPhoto: true });
  assert.deepEqual(getCompleteFeedback(http(409, "SERVICES_INCOMPLETE")), { kind: "reason", reason: COMPLETE_BLOCKED_REASON, highlightAfterPhoto: false });
  for (const code of ["FORBIDDEN", null]) {
    const error = http(403, code);
    assert.deepEqual(getCompleteFeedback(error), { kind: "error", error });
  }
  for (const error of [http(409, "INVALID_TRANSITION"), http(403, "BOOKING_LOCKED"), http(404, "NOT_FOUND"), http(500, null), new ApiError({ kind: "network" }), new Error("lạ")]) {
    const feedback = getCompleteFeedback(error);
    assert.equal(feedback.kind, "error");
    assert.ok(feedback.error instanceof ApiError);
  }
});

test("hoàn tất cục bộ: thành công chuyển Completed, giữ nguyên dịch vụ và ảnh, không sửa dữ liệu gốc", () => {
  const ready = readyToComplete();
  const result = completeLocally(ready);
  assert.equal(result.ok, true);
  assert.equal(result.data.appointment.status, "Completed");
  assert.equal(ready.appointment.status, "InProgress");
  assert.deepEqual(result.data.appointment.services, ready.appointment.services);
  assert.equal(result.data.photos, ready.photos);
  assert.equal(result.data.pet, ready.pet);
  assert.equal(completeLocally(result.data).ok, false); // đã Completed thì không hoàn tất lại
});

test("hoàn tất cục bộ: dịch vụ rỗng hoặc thiếu luôn trả SERVICES_INCOMPLETE, kể cả khi có ảnh sau", () => {
  const ready = readyToComplete();
  for (const services of [[], undefined]) {
    for (const photos of [ready.photos, []]) {
      const data = { ...ready, appointment: { ...ready.appointment, services }, photos };
      const result = completeLocally(data);
      assert.equal(result.ok, false);
      assert.deepEqual([result.error.status, result.error.code], [409, "SERVICES_INCOMPLETE"]);
      assert.equal(data.appointment.status, "InProgress");
      assert.equal(data.appointment.services, services);
    }
  }
});

test("hoàn tất cục bộ: lỗi 409 theo thứ tự trạng thái, dịch vụ, ảnh với mã có trong ERROR_CODES", () => {
  const expectConflict = (data, code) => {
    const result = completeLocally(data);
    assert.equal(result.ok, false);
    assert.ok(result.error instanceof ApiError);
    assert.deepEqual([result.error.kind, result.error.status, result.error.code], ["http", 409, code]);
    assert.ok(ERROR_CODES.includes(code));
    assert.ok(result.error.title && result.error.detail);
  };
  const ready = readyToComplete();
  expectConflict(byId(MOCK_APPOINTMENT_IDS.ready), "INVALID_TRANSITION"); // Received
  expectConflict(byId(MOCK_APPOINTMENT_IDS.blocked), "INVALID_TRANSITION");
  expectConflict(byId(MOCK_APPOINTMENT_IDS.inProgress), "SERVICES_INCOMPLETE"); // 1/2 xong, cũng chưa có ảnh sau: dịch vụ được báo trước
  expectConflict({ ...ready, photos: ready.photos.filter((entry) => entry.kind !== "After") }, "PHOTO_REQUIRED");
  const completed = createMockCompletedExecutions()[0];
  expectConflict(completed, "INVALID_TRANSITION");
});
