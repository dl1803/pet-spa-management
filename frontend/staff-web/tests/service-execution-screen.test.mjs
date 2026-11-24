import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { ApiError } from "../lib/api/errors.ts";
import { AfterPhotoCard, BeforePhotoCard } from "../features/service-execution/components/photo-cards.tsx";
import { CompleteAction } from "../features/service-execution/components/complete-action.tsx";
import { ExecutionWorkspace } from "../features/service-execution/components/execution-workspace.tsx";
import { ServicesCard } from "../features/service-execution/components/services-card.tsx";
import { COMPLETE_BLOCKED_REASON, START_BLOCKED_NO_PHOTO, getCompleteFeedback, getStartFeedback } from "../features/service-execution/execution.ts";
import { MOCK_APPOINTMENT_IDS, createMockCompletedExecutions, createMockExecutions, findMockExecution } from "../features/service-execution/mock-data.ts";
import { MOCK_WORK_HISTORY } from "../features/work-history/mock-data.ts";

const NOW = new Date("2026-11-06T02:00:00Z"); // 09:00 ngày 06/11/2026 ở cửa hàng
const TODAY = "2026-11-06";
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const byId = (id) => findMockExecution(createMockExecutions(NOW), id);
// Hạn xác nhận chi phí tính từ giờ thật để đồng hồ đếm ngược hiện khoảng 27 phút.
const liveById = (id) => findMockExecution(createMockExecutions(new Date()), id);
const hasDisabledAttribute = (html) => /\sdisabled=""/.test(html);
const render = (data) =>
  renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      React.createElement(ToastProvider, null, React.createElement(ExecutionWorkspace, { data, todayKey: TODAY, onCompleted: () => {} })),
    ),
  );
const photo = (kind, uploadedAt, photoId = `p-${kind}-${uploadedAt}`) => ({ photoId, kind, url: "blob:x", uploadedAt });

test("màn: mọi lịch từ Lịch sử công việc mở ở chế độ chỉ xem", () => {
  const completed = createMockCompletedExecutions();
  for (const { appointment } of MOCK_WORK_HISTORY) {
    const html = render(findMockExecution(completed, appointment.appointmentId));
    const total = appointment.services.length;
    assert.match(html, /Hoàn tất/);
    assert.match(html, new RegExp(`alt="Ảnh trước chăm sóc của ${appointment.petName}"`));
    assert.match(html, new RegExp(`alt="Ảnh sau chăm sóc của ${appointment.petName}"`));
    assert.match(html, new RegExp(`${total} / ${total} xong`));
    assert.match(html, /Xong lúc \d\d:\d\d/);
    for (const forbidden of [/Bắt đầu thực hiện/, /Hoàn tất lịch hẹn/, /Đánh dấu xong/, /<textarea/, /role="timer"/, /Tải ảnh lên/, /Chưa thể tải ảnh sau/, /Đổi ảnh/]) {
      assert.doesNotMatch(html, forbidden, `${appointment.petName}: ${forbidden}`);
    }
  }
});

test("màn: chưa đủ điều kiện bắt đầu (Received, chờ xác nhận chi phí, chưa có ảnh trước)", () => {
  const html = render(liveById(MOCK_APPOINTMENT_IDS.blocked));
  assert.match(html, /<h1>Bông, chó Poodle<\/h1>/);
  assert.match(html, /Đã tiếp nhận/);
  assert.match(html, /LH-1029A001\. Khách Trần Minh Anh\. 09:00 – 11:00\. Hồ sơ nhóm Nhỏ, đang chờ khách xác nhận lên Vừa\./);
  assert.match(html, /Lưu ý từ hồ sơ:<\/b> dị ứng nhẹ với sữa tắm có mùi; hơi sợ máy sấy\. Tính cách bình thường\. Lông xoăn, màu kem\./);
  assert.match(html, /Chưa hợp lệ/);
  assert.match(html, /Lịch này chưa có ảnh trước chăm sóc\. Cần chụp ảnh mới\./);
  assert.match(html, /Chụp hoặc chọn ảnh trước chăm sóc/);
  assert.match(html, /Chưa thể tải ảnh sau/);
  assert.match(html, /Tải được khi lịch đang thực hiện\./);
  assert.match(html, /0 \/ 2 xong/);
  assert.match(html, /Đang chờ khách xác nhận chi phí mới \(Nhỏ → Vừa\), còn/);
  assert.match(html, /role="timer"[^>]*>2[67]:\d\d<\/span>/);
  assert.match(html, /<button type="button"[^>]*\sdisabled=""[^>]*aria-describedby="start-blockers"[^>]*>[\s\S]*?Bắt đầu thực hiện/);
  assert.match(html, /Cần ảnh trước chăm sóc hợp lệ\./);
  assert.match(html, /Đang chờ khách xác nhận chi phí mới\.<\/li>/);
  assert.equal(count(html, /Đánh dấu xong<\/button>/g), 2);
  assert.equal(count(html, /<button type="submit"[^>]*\sdisabled=""/g), 2);
  assert.doesNotMatch(html, /Hoàn tất lịch hẹn/);
  assert.doesNotMatch(html, /<textarea/);
});

test("màn: đủ điều kiện bắt đầu (có ảnh trước, nút bật, không có lý do khóa)", () => {
  const html = render(byId(MOCK_APPOINTMENT_IDS.ready));
  assert.match(html, /<h1>Na, mèo Mèo Anh lông ngắn<\/h1>/);
  assert.match(html, /Hợp lệ/);
  assert.doesNotMatch(html, /Chưa hợp lệ/);
  assert.match(html, /alt="Ảnh trước chăm sóc của Na"/);
  assert.match(html, /<span[^>]*>Trước<\/span>/);
  assert.match(html, /09:\d\d hôm nay|\d\d:\d\d hôm nay/);
  assert.match(html, /Nhóm Nhỏ \(cân thực tế 4,2 kg\)\./);
  const startButton = html.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Bắt đầu thực hiện<\/button>/)?.[0] ?? "";
  assert.ok(startButton.length > 0);
  assert.equal(hasDisabledAttribute(startButton), false);
  assert.doesNotMatch(html, /id="start-blockers"/);
  assert.doesNotMatch(html, /role="timer"/);
});

test("màn: đang thực hiện (dịch vụ xong có giờ và ghi chú, ô ghi chú, không có nút bắt đầu hay hoàn tất)", () => {
  const html = render(byId(MOCK_APPOINTMENT_IDS.inProgress));
  assert.match(html, /Đang thực hiện/);
  assert.match(html, /1 \/ 2 xong/);
  assert.match(html, /Xong lúc \d\d:\d\d/);
  assert.match(html, /Da hơi khô vùng lưng, đã dùng sữa tắm không mùi\./);
  assert.match(html, /Đang làm/);
  assert.match(html, /Ghi chú <span[^>]*>\(không bắt buộc\)<\/span>/);
  assert.equal(count(html, /<textarea/g), 1);
  const markDone = html.match(/<button[^>]*type="submit"[^>]*>(?:(?!<\/button>)[\s\S])*Đánh dấu xong<\/button>/)?.[0] ?? "";
  assert.ok(markDone.length > 0);
  assert.equal(hasDisabledAttribute(markDone), false);
  assert.match(html, /Chụp ảnh sau khi xong mọi dịch vụ/);
  assert.doesNotMatch(html, /Chưa thể tải ảnh sau/);
  assert.doesNotMatch(html, /Bắt đầu thực hiện/);
  assert.doesNotMatch(html, /role="timer"/);
  // Còn 1 dịch vụ chưa xong và chưa có ảnh sau: nút Hoàn tất khóa kèm lý do.
  assert.match(html, /<button type="button"[^>]*\sdisabled=""[^>]*aria-describedby="complete-blockers"[^>]*>[\s\S]*?Hoàn tất lịch hẹn/);
  assert.match(html, /<ul id="complete-blockers"[^>]*>[\s\S]*?Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc\.<\/li>/);
  assert.doesNotMatch(html, /id="complete-blockers" role="alert"/);
});

test("màn: đủ điều kiện hoàn tất (mọi dịch vụ xong, có ảnh sau) thì nút Hoàn tất bật và không có lý do khóa", () => {
  const base = byId(MOCK_APPOINTMENT_IDS.inProgress);
  const services = base.appointment.services.map((service) => ({ ...service, isDone: true, doneAt: "2026-11-06T06:00:00Z" }));
  const html = render({ ...base, appointment: { ...base.appointment, services }, photos: [...base.photos, photo("After", "2026-11-06T06:05:00Z")] });
  assert.match(html, /2 \/ 2 xong/);
  const complete = html.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Hoàn tất lịch hẹn<\/button>/)?.[0] ?? "";
  assert.ok(complete.length > 0);
  assert.equal(hasDisabledAttribute(complete), false);
  assert.doesNotMatch(html, /id="complete-blockers"/);
  assert.doesNotMatch(html, /Bắt đầu thực hiện/);
});

test("nút Hoàn tất: 409 ảnh/dịch vụ hiện lý do dưới nút (role alert), INVALID_TRANSITION và 403 hiện ErrorAlert", () => {
  const http = (status, code, detail) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });
  const renderAction = (blockers, error) =>
    renderToStaticMarkup(React.createElement(CompleteAction, { blockers, feedback: error ? getCompleteFeedback(error) : null, onComplete: () => {} }));

  const locked = renderAction([COMPLETE_BLOCKED_REASON], null);
  assert.match(locked, /disabled=""/);
  assert.doesNotMatch(locked, /role="alert"/);

  for (const code of ["PHOTO_REQUIRED", "SERVICES_INCOMPLETE"]) {
    const html = renderAction([], http(409, code, "Chi tiết máy chủ"));
    assert.doesNotMatch(html, /disabled=""/); // web không khóa nút theo phản hồi, chỉ hiện lý do
    assert.match(html, /<ul id="complete-blockers" role="alert"[^>]*>[\s\S]*?Cần hoàn thành mọi dịch vụ và tải ảnh sau chăm sóc\.<\/li>/);
    assert.doesNotMatch(html, /Chi tiết máy chủ/);
  }

  const invalid = renderAction([], http(409, "INVALID_TRANSITION", "Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại."));
  assert.match(invalid, /role="alert"[^>]*>[\s\S]*?Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại\./);
  assert.doesNotMatch(invalid, /id="complete-blockers"/);

  const forbidden = renderAction([], http(403, "FORBIDDEN", "x"));
  assert.match(forbidden, /role="alert"/);
  assert.match(forbidden, /Bạn không có quyền xem trang này/);
  assert.doesNotMatch(forbidden, /id="complete-blockers"/);
});

test("thẻ Dịch vụ: lỗi 403 hiện tại chỗ, giữ danh sách dịch vụ và ghi chú đã có", () => {
  const data = byId(MOCK_APPOINTMENT_IDS.inProgress);
  const html = renderToStaticMarkup(
    React.createElement(ServicesCard, {
      data,
      completeFeedback: getCompleteFeedback(new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" })),
      onStart: () => {},
      onMarkDone: () => {},
      onComplete: () => {},
    }),
  );
  assert.match(html, /role="alert"/);
  assert.match(html, /Bạn không có quyền xem trang này/);
  assert.match(html, /Tắm &amp; sấy lông/);
  assert.match(html, /Cắt tỉa lông/);
  assert.match(html, /Da hơi khô vùng lưng, đã dùng sữa tắm không mùi\./);
  assert.match(html, /<textarea/);
  assert.match(html, /Hoàn tất lịch hẹn/);
});

test("ảnh sau chăm sóc: chỉ tô viền khi highlighted", () => {
  const renderCard = (highlighted) =>
    renderToStaticMarkup(
      React.createElement(AfterPhotoCard, { photo: null, petName: "Lu", todayKey: TODAY, canUpload: true, onUpload: () => {}, highlighted }),
    );
  assert.match(renderCard(true), /^<div class="rounded-2xl ring-2 ring-danger">/);
  assert.doesNotMatch(renderCard(false), /ring-danger/);
  assert.doesNotMatch(renderCard(undefined), /ring-danger/);
});

test("màn: có ảnh sau thì hiện ảnh nhãn Sau và thẻ Đã có, không còn ô tải", () => {
  const base = byId(MOCK_APPOINTMENT_IDS.inProgress);
  const html = render({ ...base, photos: [...base.photos, photo("After", "2026-11-06T06:00:00Z")] });
  assert.match(html, /alt="Ảnh sau chăm sóc của Lu"/);
  assert.match(html, /Đã có/);
  assert.doesNotMatch(html, /Chụp ảnh sau khi xong mọi dịch vụ/);
});

test("màn: trạng thái ngoài Received/InProgress không có thao tác nào", () => {
  const base = byId(MOCK_APPOINTMENT_IDS.ready);
  const html = render({ ...base, appointment: { ...base.appointment, status: "Completed" } });
  assert.match(html, /Hoàn tất/);
  assert.doesNotMatch(html, /Bắt đầu thực hiện/);
  assert.doesNotMatch(html, /<textarea/);
  assert.match(html, /Chưa thể tải ảnh sau/);
  assert.doesNotMatch(html, /Hoàn tất lịch hẹn/);
});

test("màn: nút Đổi ảnh chỉ hiện khi đã có ảnh và lịch còn cho tải loại ảnh đó", () => {
  const BEFORE = /aria-label="Đổi ảnh trước chăm sóc"/;
  const AFTER = /aria-label="Đổi ảnh sau chăm sóc"/;
  const ready = render(byId(MOCK_APPOINTMENT_IDS.ready)); // Received, có ảnh trước
  assert.match(ready, BEFORE);
  assert.doesNotMatch(ready, AFTER);
  assert.doesNotMatch(render(liveById(MOCK_APPOINTMENT_IDS.blocked)), /Đổi ảnh/); // chưa có ảnh nào
  const base = byId(MOCK_APPOINTMENT_IDS.inProgress); // InProgress, có ảnh trước, chưa có ảnh sau
  assert.doesNotMatch(render(base), /Đổi ảnh/);
  const afterPhoto = photo("After", "2026-11-06T06:00:00Z");
  const withAfter = render({ ...base, photos: [...base.photos, afterPhoto] });
  assert.match(withAfter, AFTER);
  assert.doesNotMatch(withAfter, BEFORE);
  const completed = { ...base, appointment: { ...base.appointment, status: "Completed" }, photos: [...base.photos, afterPhoto] };
  assert.doesNotMatch(render(completed), /Đổi ảnh/);
});

test("màn: nội dung nhập từ dữ liệu được escape", () => {
  const base = byId(MOCK_APPOINTMENT_IDS.blocked);
  const html = render({ ...base, pet: { ...base.pet, notes: "<script>alert(1)</script>" } });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

const http = (status, code, detail = "Chi tiết") => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });
const renderServices = (data, props = {}) =>
  renderToStaticMarkup(
    React.createElement(ServicesCard, { data, completeFeedback: null, onStart: () => {}, onMarkDone: () => {}, onComplete: () => {}, ...props }),
  );
const buttonOf = (html, label) => html.match(new RegExp(`<button[^>]*>(?:(?!</button>)[\\s\\S])*${label}[\\s\\S]*?</button>`))?.[0] ?? "";

test("ảnh trước chăm sóc: chỉ tô viền khi highlighted", () => {
  const renderCard = (highlighted) =>
    renderToStaticMarkup(
      React.createElement(BeforePhotoCard, { photo: null, petName: "Lu", todayKey: TODAY, canUpload: true, onUpload: () => {}, highlighted }),
    );
  assert.match(renderCard(true), /^<div class="rounded-2xl ring-2 ring-danger">/);
  assert.doesNotMatch(renderCard(false), /ring-danger/);
  assert.doesNotMatch(renderCard(undefined), /ring-danger/);
});

test("thẻ ảnh: đang tải hiện thanh tiến trình, lỗi tải hiện tại chỗ, đang bận thì khóa nút chọn ảnh", () => {
  const props = { photo: null, petName: "Lu", todayKey: TODAY, canUpload: true, onUpload: () => {} };
  const idle = renderToStaticMarkup(React.createElement(BeforePhotoCard, props));
  assert.doesNotMatch(idle, /role="progressbar"/);
  assert.equal(hasDisabledAttribute(buttonOf(idle, "Tải ảnh lên")), false);

  const uploading = renderToStaticMarkup(React.createElement(BeforePhotoCard, { ...props, uploading: { percent: 45 }, disabled: true }));
  assert.match(uploading, /role="progressbar"[^>]*aria-valuenow="45"/);
  assert.match(uploading, /width:45%/);
  assert.match(uploading, /Đang tải ảnh lên… 45%/);
  assert.equal(hasDisabledAttribute(buttonOf(uploading, "Tải ảnh lên")), true);

  const failed = renderToStaticMarkup(React.createElement(AfterPhotoCard, { ...props, uploadError: "Chỉ nhận tệp ảnh JPEG, PNG hoặc WebP." }));
  assert.match(failed, /Chỉ nhận tệp ảnh JPEG, PNG hoặc WebP\./);
  assert.match(failed, /Chụp ảnh sau khi xong mọi dịch vụ/);
});

test("thẻ Dịch vụ: 409 khi bắt đầu hiện lý do dưới nút (role alert), lỗi khác hiện ErrorAlert", () => {
  const ready = byId(MOCK_APPOINTMENT_IDS.ready);
  const reason = renderServices(ready, { startFeedback: getStartFeedback(http(409, "PHOTO_REQUIRED")) });
  assert.match(reason, /<ul id="start-blockers" role="alert"[^>]*>[\s\S]*?Cần ảnh trước chăm sóc hợp lệ\.<\/li>/);
  assert.equal(hasDisabledAttribute(buttonOf(reason, "Bắt đầu thực hiện")), false); // web thấy đủ điều kiện, backend đã từ chối: cho thử lại
  assert.equal(START_BLOCKED_NO_PHOTO, "Cần ảnh trước chăm sóc hợp lệ.");

  const error = renderServices(ready, { startFeedback: getStartFeedback(http(409, "INVALID_TRANSITION", "Không thể chuyển trạng thái.")) });
  assert.match(error, /role="alert"[\s\S]*?Không thể chuyển trạng thái\./);
  assert.doesNotMatch(error, /id="start-blockers"/);
});

test("thẻ Dịch vụ: đang bận khóa nút Bắt đầu và Đánh dấu xong, đang gửi hiện chữ đang xử lý, vẫn giữ ô ghi chú", () => {
  const ready = byId(MOCK_APPOINTMENT_IDS.ready);
  assert.equal(hasDisabledAttribute(buttonOf(renderServices(ready), "Bắt đầu thực hiện")), false);
  const busyStart = renderServices(ready, { busy: true });
  assert.equal(hasDisabledAttribute(buttonOf(busyStart, "Bắt đầu thực hiện")), true);
  const startingHtml = renderServices(ready, { busy: true, starting: true });
  assert.match(startingHtml, /aria-busy="true"[\s\S]*?Đang bắt đầu…/);

  const inProgress = byId(MOCK_APPOINTMENT_IDS.inProgress);
  const pendingId = inProgress.appointment.services.find((service) => !service.isDone).serviceId;
  const marking = renderServices(inProgress, { busy: true, markingServiceId: pendingId });
  assert.match(marking, /Đang lưu…/);
  assert.match(marking, /<textarea/);
  assert.doesNotMatch(renderServices(inProgress), /Đang lưu…/);
  for (const button of marking.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*?Đánh dấu xong<\/button>/g) ?? []) assert.ok(hasDisabledAttribute(button));
  const completing = renderServices(inProgress, { busy: true, completing: true });
  assert.match(completing, /Đang hoàn tất…/);
});

test("thẻ Dịch vụ: lỗi khi đánh dấu xong hiện tại chỗ, giữ danh sách dịch vụ", () => {
  const html = renderServices(byId(MOCK_APPOINTMENT_IDS.inProgress), { markError: http(409, "INVALID_TRANSITION", "Không thể chuyển lịch hẹn sang trạng thái này.") });
  assert.match(html, /role="alert"[\s\S]*?Không thể chuyển lịch hẹn sang trạng thái này\./);
  assert.match(html, /Tắm &amp; sấy lông/);
  assert.match(html, /<textarea/);
});
