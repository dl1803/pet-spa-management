import assert from "node:assert/strict";
import test from "node:test";
import { getLandingPath, getSafeNextPath, buildLoginPath } from "../lib/auth/paths.ts";
import { decideProxy } from "../lib/auth/proxy-rule.ts";

test("getSafeNextPath chỉ nhận đường dẫn nội bộ", () => {
  assert.equal(getSafeNextPath("/lich-hen?date=2026-11-13"), "/lich-hen?date=2026-11-13");
  for (const value of [null, "", "lich-hen", "//evil.example", "https://evil.example", "/\\evil.example", "/a\\b"]) {
    assert.equal(getSafeNextPath(value), null, String(value));
  }
});

test("getLandingPath: next hợp lệ thì dùng, ngược lại về Lịch hẹn; không quay lại màn đăng nhập", () => {
  assert.equal(getLandingPath("/khach-hang"), "/khach-hang");
  assert.equal(getLandingPath(null), "/lich-hen");
  assert.equal(getLandingPath("//evil.example"), "/lich-hen");
  assert.equal(getLandingPath("/dang-nhap"), "/lich-hen");
  assert.equal(getLandingPath("/dang-nhap?next=%2Fkhach-hang"), "/lich-hen");
});

test("buildLoginPath mã hóa next và thêm reason khi hết phiên", () => {
  assert.equal(buildLoginPath(), "/dang-nhap");
  assert.equal(buildLoginPath({ next: "/" }), "/dang-nhap");
  assert.equal(buildLoginPath({ next: "//evil.example" }), "/dang-nhap");
  assert.equal(buildLoginPath({ next: "/lich-hen?date=2026-11-13" }), "/dang-nhap?next=%2Flich-hen%3Fdate%3D2026-11-13");
  assert.equal(buildLoginPath({ next: "/thong-bao", expired: true }), "/dang-nhap?next=%2Fthong-bao&reason=expired");
  assert.equal(buildLoginPath({ expired: true }), "/dang-nhap?reason=expired");
});

test("decideProxy: chưa có cookie về đăng nhập; có cookie rời màn đăng nhập; còn lại đi tiếp", () => {
  assert.deepEqual(decideProxy({ pathname: "/lich-hen", search: "?date=2026-11-13", hasSession: false }), {
    action: "redirect",
    to: "/dang-nhap?next=%2Flich-hen%3Fdate%3D2026-11-13",
  });
  assert.deepEqual(decideProxy({ pathname: "/dang-nhap", search: "?next=%2Fkhach-hang", hasSession: true }), {
    action: "redirect",
    to: "/lich-hen",
  });
  assert.deepEqual(decideProxy({ pathname: "/dang-nhap", search: "", hasSession: false }), { action: "next" });
  assert.deepEqual(decideProxy({ pathname: "/khach-hang", search: "", hasSession: true }), { action: "next" });
});
