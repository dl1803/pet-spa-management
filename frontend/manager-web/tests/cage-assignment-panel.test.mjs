import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildCageChoices } from "../features/pending/cage-selection.ts";
import { CageAssignmentPanel } from "../features/pending/components/cage-assignment-panel.tsx";
import { MOCK_CAGE_ASSIGNMENTS } from "../features/pending/mock-data.ts";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const may = MOCK_CAGE_ASSIGNMENTS[0];
const choices = buildCageChoices(may.suggestions, may.cages, may);

function renderPanel(selectedCageId) {
  return renderToStaticMarkup(
    React.createElement(CageAssignmentPanel, {
      species: may.species,
      sizeGroup: may.sizeGroup,
      nights: 2,
      choices,
      selectedCageId,
      onSelectedCageIdChange: noop,
    }),
  );
}

test("khối chuồng: câu hướng dẫn, 4 ô radio, 2 ô khác nhóm bị khóa, 1 thẻ đề xuất", () => {
  const html = renderPanel(may.suggestions.cage.cageId);
  assert.match(html, /role="radiogroup"/);
  assert.ok(html.includes("Chuồng phù hợp mèo nhóm Vừa, trống trong cả 2 đêm."));
  assert.equal(count(html, /type="radio"/g), 4);
  assert.equal(count(html, /type="radio"[^>]*disabled=""/g), 2);
  assert.equal(count(html, /checked=""/g), 1);
  assert.equal(count(html, /Hệ thống đề xuất<\/span>/g), 1);
  assert.ok(html.indexOf(">B3<") < html.indexOf(">B1<") && html.indexOf(">B1<") < html.indexOf(">B2<"));
  assert.ok(html.includes("Trống từ 18:00 ngày 06/10"));
  assert.equal(count(html, /Không phù hợp kích cỡ/g), 2);
});

test("chọn chuồng khác thì chỉ ô đó được đánh dấu", () => {
  const html = renderPanel("c0000000-0000-4000-8000-000000000001");
  assert.equal(count(html, /checked=""/g), 1);
  assert.ok(html.includes('checked="" value="c0000000-0000-4000-8000-000000000001"'));
});

test("chuồng còn thú cưng đến sau giờ nhận bị khóa trên giao diện", () => {
  const busy = { ...may.cages[0], cageId: "busy", code: "B9", occupant: { ...may.cages[0].occupant, plannedCheckOut: "2026-10-09T12:00:00+07:00" } };
  const html = renderToStaticMarkup(
    React.createElement(CageAssignmentPanel, {
      species: may.species,
      sizeGroup: may.sizeGroup,
      nights: 2,
      choices: buildCageChoices(may.suggestions, [busy], may),
      selectedCageId: may.suggestions.cage.cageId,
      onSelectedCageIdChange: noop,
    }),
  );
  assert.equal(count(html, /type="radio"[^>]*disabled=""/g), 1);
  assert.ok(html.includes("Còn thú cưng đến 12:00 ngày 09/10"));
});
