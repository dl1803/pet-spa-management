import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffAssignmentPanel } from "../features/pending/components/staff-assignment-panel.tsx";

const tam = { staffId: "a", fullName: "Lê Minh Tâm", recentAssignmentCount: 5 };
const hanh = { staffId: "b", fullName: "Nguyễn Thị Hạnh", recentAssignmentCount: 6 };
const quyen = { staffId: "c", fullName: "Trần Thị Quyên" };

function render(suggestions, selectedStaffIds) {
  return renderToStaticMarkup(
    React.createElement(StaffAssignmentPanel, { suggestions, selectedStaffIds, onSelectedStaffIdsChange() {} }),
  );
}

test("cần 1 người: nhóm radio, người đề xuất có thẻ và đang được chọn", () => {
  const html = render({ staffRequired: 1, suggested: [tam], alternatives: [hanh, quyen] }, ["a"]);
  assert.match(html, /role="radiogroup"/);
  assert.equal((html.match(/type="radio"/g) ?? []).length, 3);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 0);
  assert.equal((html.match(/checked=""/g) ?? []).length, 1);
  assert.equal((html.match(/Hệ thống đề xuất<\/span>/g) ?? []).length, 1);
  assert.ok(html.includes("Nhân viên spa phụ trách, cần 1 người"));
  assert.ok(html.includes("Đã chọn 1 / 1"));
  assert.ok(!html.includes("Lịch này cần đúng"));
});

test("cần 2 người: nhóm ô kiểm, nhãn viết tắt và số lịch hiển thị; thiếu số lịch thì ẩn", () => {
  const html = render({ staffRequired: 2, suggested: [tam, hanh], alternatives: [quyen] }, ["a", "b"]);
  assert.match(html, /role="group"/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 3);
  assert.equal((html.match(/checked=""/g) ?? []).length, 2);
  assert.ok(html.includes(">LT<") && html.includes(">NH<") && html.includes(">TQ<"));
  assert.equal((html.match(/lịch \/ 30 ngày/g) ?? []).length, 2);
});

test("chọn thiếu hoặc thừa người thì báo cần đúng số người và gắn aria-describedby", () => {
  for (const selected of [["a"], ["a", "b", "c"]]) {
    const html = render({ staffRequired: 2, suggested: [tam, hanh], alternatives: [quyen] }, selected);
    assert.ok(html.includes("Lịch này cần đúng 2 nhân viên."));
    const errorId = html.match(/<p id="([^"]+)"/)?.[1];
    assert.ok(errorId);
    assert.ok(html.includes(`aria-describedby="${errorId}"`));
  }
});

test("không có nhân viên nào thì không có ô chọn nhưng vẫn báo cần đúng số người", () => {
  const html = render({ staffRequired: 1, suggested: [], alternatives: [] }, []);
  assert.equal((html.match(/<input/g) ?? []).length, 0);
  assert.doesNotMatch(html, /role="(?:group|radiogroup)"/);
  assert.ok(html.includes("Chưa có nhân viên phù hợp để chọn cho lịch này."));
  assert.ok(html.includes("Lịch này cần đúng 1 nhân viên."));
  assert.ok(html.includes("Đã chọn 0 / 1"));
});

test("tên nhân viên được escape", () => {
  const html = render({ staffRequired: 1, suggested: [{ staffId: "x", fullName: "<script>x</script>" }], alternatives: [] }, ["x"]);
  assert.ok(!html.includes("<script>"));
});
