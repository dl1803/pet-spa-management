import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ERROR_CODES } from "../frontend/manager-web/lib/api/errors.ts";

test("mã lỗi Web Quản lý khớp contract backend", () => {
  const backend = readFileSync(new URL("../backend/src/PetSpa.Domain/Exceptions/ErrorCodes.cs", import.meta.url), "utf8");
  const codes = [...backend.matchAll(/= "([A-Z_]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ERROR_CODES).size, ERROR_CODES.length);
  assert.deepEqual([...ERROR_CODES].sort(), codes.sort());
});
