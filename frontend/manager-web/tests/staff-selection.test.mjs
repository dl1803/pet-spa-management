import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStaffChoices,
  getInitialStaffIds,
  isStaffSelectionComplete,
  toggleStaffId,
} from "../features/pending/staff-selection.ts";

const tam = { staffId: "a", fullName: "Lê Minh Tâm", recentAssignmentCount: 5 };
const hanh = { staffId: "b", fullName: "Nguyễn Thị Hạnh", recentAssignmentCount: 6 };
const quyen = { staffId: "c", fullName: "Trần Thị Quyên", recentAssignmentCount: 9 };

test("người đề xuất đứng trước, trùng staffId chỉ giữ lần đầu", () => {
  const choices = buildStaffChoices({ staffRequired: 1, suggested: [tam], alternatives: [hanh, tam, quyen] });
  assert.deepEqual(choices.map((choice) => [choice.staff.staffId, choice.isSuggested]), [
    ["a", true],
    ["b", false],
    ["c", false],
  ]);
});

test("chọn sẵn người được đề xuất, không quá số người cần", () => {
  assert.deepEqual(getInitialStaffIds({ staffRequired: 1, suggested: [tam, hanh], alternatives: [] }), ["a"]);
  assert.deepEqual(getInitialStaffIds({ staffRequired: 2, suggested: [tam, hanh], alternatives: [quyen] }), ["a", "b"]);
  assert.deepEqual(getInitialStaffIds({ staffRequired: 2, suggested: [tam], alternatives: [hanh] }), ["a"]);
  assert.deepEqual(getInitialStaffIds({ staffRequired: 1, suggested: [], alternatives: [hanh] }), []);
});

test("cần 1 người: chọn người khác thì thay người đang chọn", () => {
  assert.deepEqual(toggleStaffId(["a"], "b", 1), ["b"]);
  assert.deepEqual(toggleStaffId([], "b", 1), ["b"]);
  assert.deepEqual(toggleStaffId(["a"], "a", 1), ["a"]);
});

test("cần 2 người: bấm để chọn hoặc bỏ chọn, không đổi mảng đầu vào", () => {
  const selected = ["a", "b"];
  assert.deepEqual(toggleStaffId(selected, "b", 2), ["a"]);
  assert.deepEqual(toggleStaffId(["a"], "c", 2), ["a", "c"]);
  assert.deepEqual(toggleStaffId(["a", "b"], "c", 2), ["a", "b", "c"]);
  assert.deepEqual(selected, ["a", "b"]);
});

test("chỉ đủ khi số người chọn đúng bằng số người cần", () => {
  assert.equal(isStaffSelectionComplete(["a"], 1), true);
  assert.equal(isStaffSelectionComplete([], 1), false);
  assert.equal(isStaffSelectionComplete(["a"], 2), false);
  assert.equal(isStaffSelectionComplete(["a", "b"], 2), true);
  assert.equal(isStaffSelectionComplete(["a", "b", "c"], 2), false);
});
