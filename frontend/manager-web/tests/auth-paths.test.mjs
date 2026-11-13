import assert from "node:assert/strict";
import test from "node:test";
import { buildLoginPath, getLandingPath, getSafeNextPath } from "../lib/auth/paths.ts";
import { decideProxy } from "../lib/auth/proxy-rule.ts";

test("getSafeNextPath chỉ nhận đường dẫn nội bộ", () => {
  assert.equal(getSafeNextPath("/lich-hen?date=2026-11-14"), "/lich-hen?date=2026-11-14");
  for (const value of [null, "", "lich-hen", "//evil.example", "https://evil.example", "/\\evil.example", "/a\\b"]) {
    assert.equal(getSafeNextPath(value), null, String(value));
  }
});

test("getLandingPath: next hợp lệ thì dùng, ngược lại về Tổng quan; không quay lại màn đăng nhập", () => {
  assert.equal(getLandingPath("/nhan-vien"), "/nhan-vien");
  assert.equal(getLandingPath(null), "/");
  assert.equal(getLandingPath("//evil.example"), "/");
  assert.equal(getLandingPath("/dang-nhap"), "/");
  assert.equal(getLandingPath("/dang-nhap?next=%2Fnhan-vien"), "/");
});

test("buildLoginPath mã hóa next và thêm reason khi hết phiên", () => {
  assert.equal(buildLoginPath(), "/dang-nhap");
  assert.equal(buildLoginPath({ next: "/" }), "/dang-nhap");
  assert.equal(buildLoginPath({ next: "//evil.example" }), "/dang-nhap");
  assert.equal(buildLoginPath({ next: "/lich-hen?date=2026-11-14" }), "/dang-nhap?next=%2Flich-hen%3Fdate%3D2026-11-14");
  assert.equal(buildLoginPath({ next: "/thanh-toan", expired: true }), "/dang-nhap?next=%2Fthanh-toan&reason=expired");
  assert.equal(buildLoginPath({ expired: true }), "/dang-nhap?reason=expired");
});

test("decideProxy: chưa có cookie về đăng nhập; có cookie rời màn đăng nhập về /; còn lại đi tiếp", () => {
  assert.deepEqual(decideProxy({ pathname: "/lich-hen", search: "?date=2026-11-14", hasSession: false }), {
    action: "redirect",
    to: "/dang-nhap?next=%2Flich-hen%3Fdate%3D2026-11-14",
  });
  assert.deepEqual(decideProxy({ pathname: "/dang-nhap", search: "?next=%2Fnhan-vien", hasSession: true }), {
    action: "redirect",
    to: "/",
  });
  assert.deepEqual(decideProxy({ pathname: "/dang-nhap", search: "", hasSession: false }), { action: "next" });
  assert.deepEqual(decideProxy({ pathname: "/nhan-vien", search: "", hasSession: true }), { action: "next" });
});
