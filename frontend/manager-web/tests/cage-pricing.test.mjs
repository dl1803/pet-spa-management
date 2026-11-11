import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { HotelPricingPanel } from "../features/cages/components/hotel-pricing-panel.tsx";
import { createHotelPricingFormValues, findPricingProblems } from "../features/cages/forms.ts";
import { MOCK_HOTEL_PRICING } from "../features/cages/mock-data.ts";

const count = (html, pattern) => (html.match(pattern) ?? []).length;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

function PricingHarness({ problems, lateFeeError }) {
  const values = createHotelPricingFormValues(MOCK_HOTEL_PRICING);
  const { register } = useForm({ defaultValues: values });
  return React.createElement(HotelPricingPanel, { register, problems: problems ?? findPricingProblems(values.rows), lateFeeError });
}

test("HotelPricingPanel: bảng 11 dòng theo UI demo, mỗi dòng 2 ô nhập có nhãn nêu đơn vị và nhóm", () => {
  const html = render(PricingHarness, {});
  assert.ok(html.includes("Giá mỗi đêm theo loài và nhóm kích cỡ"));
  for (const text of ["Loài", "Nhóm", "Chỗ ở / đêm", "Thức ăn / đêm"]) assert.ok(html.includes(`>${text}</th>`), text);
  assert.equal(count(html, /rowSpan="3"/g), 3);
  assert.equal(count(html, /rowSpan="2"/g), 1);
  assert.equal(count(html, /<input\b/g), 23);
  assert.equal(count(html, /inputMode="numeric"/g), 23);
  assert.equal(count(html, /aria-label="Chỗ ở mỗi đêm \(đ\), nhóm /g), 11);
  assert.equal(count(html, /aria-label="Thức ăn mỗi đêm \(đ\), nhóm /g), 11);
  assert.ok(html.includes('aria-label="Chỗ ở mỗi đêm (đ), nhóm Lớn của Chuột lang"'));
  assert.ok(html.indexOf("Chó") < html.indexOf("Mèo") && html.indexOf("Mèo") < html.indexOf("Thỏ") && html.indexOf("Thỏ") < html.indexOf("Chuột lang"));
  assert.ok(!html.includes('role="alert"') && !html.includes("aria-invalid"));
});

test("HotelPricingPanel: khối Phí trả muộn có ô bắt buộc, mô tả mốc thời gian dạng chữ (không liên kết) và ghi chú áp dụng", () => {
  const html = render(PricingHarness, {});
  assert.ok(html.includes("<h2>Phí trả muộn</h2>") && html.includes("Mức phí mỗi lần"));
  assert.match(html, /<input[^>]*id="[^"]*-late-fee"[^>]*aria-required="true"|<input[^>]*aria-required="true"[^>]*id="[^"]*-late-fee"/);
  assert.ok(html.includes("Miễn phí 30 phút đầu sau giờ trả dự kiến. Từ phút thứ 31, mỗi 60 phút tính 1 lần. Hai mốc thời gian này đổi tại Cấu hình."));
  assert.ok(html.includes("Giá mới áp dụng cho lịch lưu trú tạo sau khi lưu. Tiền lưu trú = số đêm × (chỗ ở + thức ăn)."));
  assert.ok(!html.includes("<a ") && !html.includes("<button"));
});

test("HotelPricingPanel: dòng giá lỗi hiện thông báo đầu khối và đánh dấu đúng 2 ô của dòng đó; lỗi phí hiện dưới ô phí", () => {
  const problems = [{ species: "Cat", sizeGroup: "Medium", message: "Thiếu giá chỗ ở hoặc giá thức ăn cho nhóm Vừa của Mèo." }];
  const html = render(PricingHarness, { problems, lateFeeError: "Vui lòng nhập mức phí mỗi lần." });
  assert.equal(count(html, /role="alert"/g), 1);
  assert.ok(html.includes("Thiếu giá chỗ ở hoặc giá thức ăn cho nhóm Vừa của Mèo."));
  assert.equal(count(html, /aria-invalid="true"/g), 3);
  assert.match(html, /aria-label="Chỗ ở mỗi đêm \(đ\), nhóm Vừa của Mèo"[^>]*aria-invalid="true"|aria-invalid="true"[^>]*aria-label="Chỗ ở mỗi đêm \(đ\), nhóm Vừa của Mèo"/);
  assert.ok(html.includes("Vui lòng nhập mức phí mỗi lần."));
});
