import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthLayout } from "../components/layout/auth-layout.tsx";
import { PetAvatar } from "../components/domain/pet-avatar.tsx";
import { Input } from "../components/ui/input.tsx";
import { ApiError } from "../lib/api/errors.ts";
import {
  isLoginRejectedError,
  isWrongWebError,
  toLoginRequest,
  validateLoginPassword,
  validateLoginPhone,
} from "../features/auth/forms.ts";
import { isManagerMe } from "../lib/auth/roles.ts";

test("toLoginRequest: userName là số điện thoại đã chuẩn hóa, giữ nguyên mật khẩu", () => {
  assert.deepEqual(toLoginRequest({ phone: " 0909 686.868 ", password: " Mật khẩu " }), {
    userName: "0909686868",
    password: " Mật khẩu ",
  });
});

test("validateLoginPhone và validateLoginPassword: chỉ yêu cầu có nhập", () => {
  assert.equal(validateLoginPhone("   "), "Vui lòng nhập số điện thoại.");
  assert.equal(validateLoginPhone("0909 686 868"), true);
  assert.equal(validateLoginPassword(""), "Vui lòng nhập mật khẩu.");
  assert.equal(validateLoginPassword(" "), true);
});

test("phân loại lỗi đăng nhập: 401 sai thông tin, 403 FORBIDDEN sai web, còn lại không thuộc hai loại", () => {
  assert.equal(isLoginRejectedError(new ApiError({ kind: "http", status: 401, code: "UNAUTHENTICATED" })), true);
  assert.equal(isLoginRejectedError(new ApiError({ kind: "http", status: 429, code: "RATE_LIMITED" })), false);
  assert.equal(isWrongWebError(new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" })), true);
  assert.equal(isWrongWebError(new ApiError({ kind: "http", status: 401, code: "UNAUTHENTICATED" })), false);
  assert.equal(isWrongWebError(new ApiError({ kind: "network" })), false);
});

test("isManagerMe chỉ nhận role Manager", () => {
  assert.equal(isManagerMe({ userId: "1", userName: "0909686868", role: "Manager" }), true);
  assert.equal(isManagerMe({ userId: "1", userName: "a", role: "Staff", staffRole: "Receptionist" }), false);
  assert.equal(isManagerMe({ userId: "1", userName: "a", role: "Customer" }), false);
  assert.equal(isManagerMe(null), false);
});

test("AuthLayout: tiêu đề, mô tả, ba ảnh thú cưng và nội dung form", () => {
  const html = renderToStaticMarkup(
    createElement(AuthLayout, { heading: "Tiêu đề", description: "Mô tả", species: ["GuineaPig", "Cat", "Dog"] }, createElement("form", null, "NỘI DUNG")),
  );
  assert.match(html, /Web quản lý/);
  assert.match(html, /Tiêu đề/);
  assert.doesNotMatch(html, /<h[12]\b/);
  assert.match(html, /NỘI DUNG/);
  assert.equal((html.match(/bg-sp-/g) ?? []).length, 3);
});

test("Input: prefixIcon thêm biểu tượng và chừa chỗ; không có prefixIcon/suffix thì giữ nguyên", () => {
  const plain = renderToStaticMarkup(createElement(Input, { id: "a" }));
  assert.doesNotMatch(plain, /<svg/);
  assert.doesNotMatch(plain, /pl-\[38px\]/);
  const withIcon = renderToStaticMarkup(createElement(Input, { id: "a", prefixIcon: "phone" }));
  assert.match(withIcon, /<svg/);
  assert.match(withIcon, /pl-\[38px\]/);
  const withSuffix = renderToStaticMarkup(createElement(Input, { id: "a", suffix: "đ" }));
  assert.match(withSuffix, /pr-14/);
  assert.doesNotMatch(withSuffix, /pl-\[38px\]/);
});

test("PetAvatar cỡ lg rộng 72px", () => {
  assert.match(renderToStaticMarkup(createElement(PetAvatar, { species: "Dog", size: "lg" })), /size-\[72px\]/);
});
