import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthLayout } from "../components/layout/auth-layout.tsx";
import { ApiError } from "../lib/api/errors.ts";
import {
  isLoginRejectedError,
  isWrongWebError,
  toLoginRequest,
  validateLoginPhone,
} from "../features/auth/forms.ts";
import { isStaffMe } from "../lib/auth/roles.ts";

test("toLoginRequest: userName là số điện thoại đã chuẩn hóa, giữ nguyên mật khẩu", () => {
  assert.deepEqual(toLoginRequest({ phone: " 0934 778 120 ", password: " Mật khẩu " }), {
    userName: "0934778120",
    password: " Mật khẩu ",
  });
});

test("validateLoginPhone: chỉ yêu cầu có nhập", () => {
  assert.equal(validateLoginPhone("   "), "Vui lòng nhập số điện thoại.");
  assert.equal(validateLoginPhone("0934 778 120"), true);
});

test("phân loại lỗi đăng nhập: 401 sai thông tin, 403 FORBIDDEN sai web, còn lại không thuộc hai loại", () => {
  assert.equal(isLoginRejectedError(new ApiError({ kind: "http", status: 401, code: "UNAUTHENTICATED" })), true);
  assert.equal(isLoginRejectedError(new ApiError({ kind: "http", status: 429, code: "RATE_LIMITED" })), false);
  assert.equal(isWrongWebError(new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" })), true);
  assert.equal(isWrongWebError(new ApiError({ kind: "http", status: 401, code: "UNAUTHENTICATED" })), false);
  assert.equal(isWrongWebError(new ApiError({ kind: "network" })), false);
});

test("isStaffMe chỉ nhận Staff có staffRole hợp lệ", () => {
  assert.equal(isStaffMe({ userId: "1", userName: "a", role: "Staff", staffRole: "Receptionist" }), true);
  assert.equal(isStaffMe({ userId: "1", userName: "a", role: "Staff", staffRole: "SpaStaff" }), true);
  assert.equal(isStaffMe({ userId: "1", userName: "a", role: "Staff", staffRole: null }), false);
  assert.equal(isStaffMe({ userId: "1", userName: "a", role: "Manager", staffRole: null }), false);
  assert.equal(isStaffMe({ userId: "1", userName: "a", role: "Customer" }), false);
  assert.equal(isStaffMe(null), false);
});

test("AuthLayout: tiêu đề, mô tả, hai ảnh thú cưng và nội dung form", () => {
  const html = renderToStaticMarkup(
    createElement(AuthLayout, { heading: "Bắt đầu ca làm việc.", description: "Mô tả", species: ["Dog", "Rabbit"] }, createElement("form", null, "NỘI DUNG")),
  );
  assert.match(html, /Web nhân viên/);
  assert.match(html, /Bắt đầu ca làm việc\./);
  assert.match(html, /NỘI DUNG/);
  assert.equal((html.match(/bg-sp-/g) ?? []).length, 2);
});
