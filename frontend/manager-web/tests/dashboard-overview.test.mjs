// tests/dashboard-overview.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAttentionItems,
  buildTimelineRows,
  describeUpdatedAt,
  getNowOffset,
  getShortName,
  isTrackedSpa,
  listOccupiedCages,
  summarizeKpis,
  toTimelineSpan,
} from "../features/dashboard/overview.ts";
import { MOCK_DASHBOARD } from "../features/dashboard/mock-data.ts";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
const with_ = (changes) => ({ ...MOCK_DASHBOARD, ...changes });

test("toTimelineSpan: tính % theo khung 08:00 – 21:00 và cắt phần ngoài khung", () => {
  const day = "2026-10-06";
  const nine = toTimelineSpan("2026-10-06T09:00:00+07:00", "2026-10-06T11:00:00+07:00", day);
  close(nine.left, (60 / 780) * 100);
  close(nine.width, (120 / 780) * 100);
  const clipped = toTimelineSpan("2026-10-06T07:00:00+07:00", "2026-10-06T08:30:00+07:00", day);
  close(clipped.left, 0);
  close(clipped.width, (30 / 780) * 100);
  assert.equal(toTimelineSpan("2026-10-06T21:00:00+07:00", "2026-10-06T22:00:00+07:00", day), null);
  assert.equal(toTimelineSpan("2026-10-06T06:00:00+07:00", "2026-10-06T07:30:00+07:00", day), null);
  assert.equal(toTimelineSpan("2026-10-07T09:00:00+07:00", "2026-10-07T11:00:00+07:00", day), null);
  const overnight = toTimelineSpan("2026-10-05T23:00:00+07:00", "2026-10-06T09:00:00+07:00", day);
  close(overnight.left, 0);
  close(overnight.width, (60 / 780) * 100);
});

test("getNowOffset: vạch hiện tại trong khung giờ; ngoài khung thì không vẽ", () => {
  close(getNowOffset("2026-10-06T09:20:00+07:00"), (80 / 780) * 100);
  assert.equal(getNowOffset("2026-10-06T07:59:00+07:00"), null);
  assert.equal(getNowOffset("2026-10-06T21:01:00+07:00"), null);
});

test("lịch đã hoàn tất hoặc đã hủy và lịch lưu trú không được tính là lịch spa đang theo dõi", () => {
  const completed = MOCK_DASHBOARD.spaToday.find((item) => item.status === "Completed");
  assert.ok(completed);
  assert.equal(isTrackedSpa(completed), false);
  assert.equal(isTrackedSpa({ ...completed, status: "Cancelled" }), false);
  assert.equal(isTrackedSpa({ ...completed, status: "InProgress" }), true);
  assert.equal(isTrackedSpa(MOCK_DASHBOARD.hotelAppointments[0]), false);
});

test("getShortName: từ cuối của họ tên", () => {
  assert.equal(getShortName("Nguyễn Thị Hạnh"), "Hạnh");
  assert.equal(getShortName("  Tâm "), "Tâm");
});

test("buildTimelineRows: 3 nhân viên spa đang hoạt động + hàng Chưa phân công; bỏ lễ tân và người đã vô hiệu hóa", () => {
  const rows = buildTimelineRows(MOCK_DASHBOARD);
  assert.deepEqual(rows.map((row) => row.label), ["Hạnh", "Quyên", "Tâm", "Chưa phân công"]);
  assert.equal(rows.at(-1).staffId, null);
  assert.deepEqual(rows.map((row) => row.shifts.length), [1, 1, 1, 0]);
  const names = (row) => row.blocks.map((block) => block.petName);
  assert.deepEqual(names(rows[0]), ["Bông", "Mít"]);
  assert.deepEqual(names(rows[1]), ["Nâu", "Sushi"]);
  assert.deepEqual(names(rows[2]), ["Mước"]);
  assert.deepEqual(names(rows[3]), ["Mochi"]);
  assert.equal(rows[3].blocks[0].status, "Pending");
});

test("buildTimelineRows: khối có vạch dọn dẹp theo bufferMinutes; lịch hoàn tất không có khối", () => {
  const rows = buildTimelineRows(MOCK_DASHBOARD);
  const bong = rows[0].blocks[0];
  close(bong.buffer.left, bong.span.left + bong.span.width);
  close(bong.buffer.width, (15 / 780) * 100);
  assert.ok(!rows.flatMap((row) => row.blocks).some((block) => block.petName === "Gạo"));
  const noBuffer = buildTimelineRows(with_({ bufferMinutes: 0 }));
  assert.equal(noBuffer[0].blocks[0].buffer, null);
});

test("buildTimelineRows: lịch 2 nhân viên hiện ở cả 2 hàng; lịch chỉ có nhân viên không còn trong danh sách rơi vào Chưa phân công", () => {
  const [bong] = MOCK_DASHBOARD.spaToday;
  const quyen = MOCK_DASHBOARD.staff[1];
  const two = { ...bong, staffRequired: 2, staff: [...bong.staff, { staffId: quyen.staffId, fullName: quyen.fullName, isHolding: true }] };
  const rows = buildTimelineRows(with_({ spaToday: [two] }));
  assert.equal(rows[0].blocks.length, 1);
  assert.equal(rows[1].blocks.length, 1);
  assert.equal(rows[3].blocks.length, 0);
  const orphan = { ...bong, staff: [{ staffId: "00000000-0000-4000-8000-000000000000", isHolding: true }] };
  assert.equal(buildTimelineRows(with_({ spaToday: [orphan] }))[3].blocks.length, 1);
  assert.equal(buildTimelineRows(with_({ spaToday: [{ ...bong, slotStart: null }] })).flatMap((row) => row.blocks).length, 0);
});

test("buildTimelineRows: lịch Pending chỉ hiện ở hàng Chưa phân công dù có staff", () => {
  const [bong] = MOCK_DASHBOARD.spaToday;
  const pending = { ...bong, status: "Pending" };
  const rows = buildTimelineRows(with_({ spaToday: [pending] }));
  assert.ok(rows.filter((row) => row.staffId !== null).every((row) => row.blocks.length === 0));
  assert.deepEqual(rows.at(-1).blocks.map((block) => block.appointmentId), [pending.appointmentId]);
});

test("buildTimelineRows: bỏ lịch và ca làm của ngày khác theo múi giờ cửa hàng", () => {
  const [bong, mit] = MOCK_DASHBOARD.spaToday;
  const [shift] = MOCK_DASHBOARD.shifts;
  const rows = buildTimelineRows(with_({
    now: "2026-10-05T23:30:00Z",
    spaToday: [bong, { ...mit, slotStart: "2026-10-07T12:00:00+07:00", slotEnd: "2026-10-07T13:00:00+07:00" }],
    shifts: [shift, { ...shift, shiftStart: "2026-10-07T08:00:00+07:00", shiftEnd: "2026-10-07T17:00:00+07:00" }],
  }));
  assert.deepEqual(rows[0].blocks.map((block) => block.appointmentId), [bong.appointmentId]);
  assert.equal(rows[0].shifts.length, 1);
});

test("summarizeKpis: 4 thẻ khớp UI demo", () => {
  const kpis = summarizeKpis(MOCK_DASHBOARD);
  assert.deepEqual(kpis.pending, { total: 4, caption: "Spa 3, lưu trú 1. Cần bạn xử lý" });
  assert.deepEqual(kpis.spaToday, { total: 6, caption: "1 đang làm, 2 đã tiếp nhận, 2 chờ đến" });
  assert.deepEqual(kpis.cages, { occupied: 3, active: 11, caption: "Nhận hôm nay 1, trả hôm nay 1" });
  assert.deepEqual(kpis.unpaid, { count: 2, total: 690000, caption: "690.000đ, đều là tiền lưu trú" });
});

test("summarizeKpis: không có dữ liệu thì không báo cần xử lý; khoản lẫn loại chỉ hiện tổng tiền", () => {
  const empty = summarizeKpis(with_({ pendingCounts: { spa: 0, hotel: 0 }, unpaidPayments: [], spaToday: [], cages: [], hotelAppointments: [] }));
  assert.equal(empty.pending.caption, "Không có lịch chờ xác nhận.");
  assert.equal(empty.spaToday.caption, "0 đang làm, 0 đã tiếp nhận, 0 chờ đến");
  assert.equal(empty.cages.caption, "Nhận hôm nay 0, trả hôm nay 0");
  assert.equal(empty.unpaid.caption, "Không có khoản nào chưa thanh toán.");
  const mixed = summarizeKpis(with_({ unpaidPayments: [{ ...MOCK_DASHBOARD.unpaidPayments[0] }, { ...MOCK_DASHBOARD.unpaidPayments[1], kind: "LateFee", amount: 50000 }] }));
  assert.equal(mixed.unpaid.caption, "300.000đ");
});

test("summarizeKpis: nhận/trả ngày khác hôm nay không được đếm", () => {
  const moved = MOCK_DASHBOARD.hotelAppointments.map((item) => ({
    ...item,
    plannedCheckIn: "2026-10-07T10:00:00+07:00",
    plannedCheckOut: "2026-10-07T18:00:00+07:00",
  }));
  assert.equal(summarizeKpis(with_({ hotelAppointments: moved })).cages.caption, "Nhận hôm nay 0, trả hôm nay 0");
});

test("buildAttentionItems: 3 mục theo thứ tự chi phí → nhận → trả; chỉ lịch spa có liên kết", () => {
  const items = buildAttentionItems(MOCK_DASHBOARD);
  assert.deepEqual(items.map((item) => item.kind), ["CostConfirmation", "CheckIn", "CheckOut"]);
  assert.equal(items[0].title, "Bông chờ khách xác nhận chi phí");
  assert.equal(items[0].detail, "LH-5F1C0405. Hết hạn lúc 09:33, sau đó tự động hủy.");
  assert.equal(items[0].href, "/lich-hen/5f1c0405-7e44-4c0a-9d21-0a1b2c3d4e00");
  assert.equal(items[1].title, "Cốm nhận lúc 10:00");
  assert.equal(items[1].detail, "LH-5F1C0402, chuồng C1. Chưa thu tiền lưu trú.");
  assert.equal(items[2].title, "Tuyết trả lúc 18:00");
  assert.equal(items[2].detail, "LH-5F1C03EB, chuồng B1.");
  assert.equal(items[1].href, null);
  assert.equal(items[2].href, null);
});

test("buildAttentionItems: nhận hôm nay đã thu tiền thì không cần chú ý; yêu cầu chi phí đã xử lý thì không hiện", () => {
  assert.equal(buildAttentionItems(with_({ unpaidPayments: [] })).some((item) => item.kind === "CheckIn"), false);
  const handled = MOCK_DASHBOARD.spaToday.map((item) =>
    item.pendingCostConfirmation ? { ...item, pendingCostConfirmation: { ...item.pendingCostConfirmation, status: "Accepted" } } : item,
  );
  assert.equal(buildAttentionItems(with_({ spaToday: handled })).some((item) => item.kind === "CostConfirmation"), false);
});

test("listOccupiedCages: trả sớm nhất ở trên, nhãn “hôm nay” hoặc “ngày dd/MM”", () => {
  const cages = listOccupiedCages(MOCK_DASHBOARD);
  assert.deepEqual(cages.map((cage) => cage.label), ["B1, Tuyết", "A2, Bơ", "D2, Kem"]);
  assert.deepEqual(cages.map((cage) => cage.returnText), ["Trả 18:00 hôm nay", "Trả 17:00 ngày 07/10", "Trả 10:00 ngày 09/10"]);
  assert.deepEqual(cages.map((cage) => cage.species), ["Cat", "Dog", "GuineaPig"]);
  assert.deepEqual(listOccupiedCages(with_({ cages: [] })), []);
});

test("describeUpdatedAt: thứ, ngày và giờ cập nhật theo múi giờ cửa hàng", () => {
  assert.equal(describeUpdatedAt("2026-10-06T09:20:00+07:00"), "Thứ ba 06/10/2026. Cập nhật lúc 09:20.");
  assert.equal(describeUpdatedAt("2026-10-05T23:20:00Z"), "Thứ ba 06/10/2026. Cập nhật lúc 06:20.");
});
