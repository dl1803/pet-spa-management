import assert from "node:assert/strict";
import test from "node:test";
import {
  FORM_MESSAGES,
  createCounterFormValues,
  isCounterMethod,
  parseMoneyInput,
  toCounterPaymentRequest,
  validateReceivedAmount,
} from "../features/payments/forms.ts";

test("parseMoneyInput: bỏ dấu chấm và khoảng trắng; chữ cái, số âm, số thập phân, rỗng hoặc quá 12 chữ số → null", () => {
  assert.equal(parseMoneyInput("250.000"), 250000);
  assert.equal(parseMoneyInput(" 250000 "), 250000);
  assert.equal(parseMoneyInput("1 250 000"), 1250000);
  assert.equal(parseMoneyInput("0"), 0);
  for (const text of ["", " ", "abc", "-1", "250,5", "25a0", "1e3"]) assert.equal(parseMoneyInput(text), null, text);
  assert.equal(parseMoneyInput("999999999999"), 999999999999);
  assert.equal(parseMoneyInput("1000000000000"), null);
});

test("createCounterFormValues: mặc định tiền mặt, số tiền thực nhận bằng số tiền phải trả, có dấu chấm ngăn nghìn", () => {
  assert.deepEqual(createCounterFormValues(250000), { method: "Cash", receivedAmount: "250.000" });
  assert.deepEqual(createCounterFormValues(0), { method: "Cash", receivedAmount: "0" });
});

test("validateReceivedAmount: trống, sai định dạng, thiếu tiền bị chặn; bằng hoặc hơn thì hợp lệ", () => {
  const validate = validateReceivedAmount(250000);
  assert.equal(validate(""), FORM_MESSAGES.receivedAmountRequired);
  assert.equal(validate("   "), FORM_MESSAGES.receivedAmountRequired);
  assert.equal(validate("abc"), FORM_MESSAGES.receivedAmountInvalid);
  assert.equal(validate("249.999"), FORM_MESSAGES.receivedAmountInsufficient);
  assert.equal(validate("0"), FORM_MESSAGES.receivedAmountInsufficient);
  assert.equal(validate("250.000"), true);
  assert.equal(validate("250000"), true);
  assert.equal(validate("300.000"), true);
  assert.equal(FORM_MESSAGES.receivedAmountInsufficient, "Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.");
});

test("khoản 0đ: số tiền thực nhận 0 vẫn hợp lệ", () => {
  assert.equal(validateReceivedAmount(0)("0"), true);
});

test("toCounterPaymentRequest: chỉ gửi method và receivedAmount dạng số, không gửi amount", () => {
  const request = toCounterPaymentRequest({ method: "BankQR", receivedAmount: "300.000" });
  assert.deepEqual(request, { method: "BankQR", receivedAmount: 300000 });
  assert.deepEqual(Object.keys(request).sort(), ["method", "receivedAmount"]);
  assert.throws(() => toCounterPaymentRequest({ method: "Cash", receivedAmount: "abc" }));
});

test("isCounterMethod: chỉ Cash và BankQR; Online do cổng thanh toán đặt nên không được chọn ở quầy", () => {
  assert.equal(isCounterMethod("Cash"), true);
  assert.equal(isCounterMethod("BankQR"), true);
  assert.equal(isCounterMethod("Online"), false);
  assert.equal(isCounterMethod(""), false);
});
