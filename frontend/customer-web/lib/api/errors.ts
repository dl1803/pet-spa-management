import { isAxiosError } from "axios";

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "BOOKING_LOCKED",
  "NOT_FOUND",
  "DUPLICATE_CONTACT",
  "SLOT_FULL",
  "NO_CAPACITY",
  "STAFF_CONFLICT",
  "CAGE_CONFLICT",
  "INVALID_TRANSITION",
  "CHANGE_WINDOW_CLOSED",
  "PHOTO_REQUIRED",
  "SERVICES_INCOMPLETE",
  "STAFF_COUNT_MISMATCH",
  "SHIFT_OVERLAP",
  "SHIFT_HAS_APPOINTMENTS",
  "COST_CONFIRMATION_PENDING",
  "PAYMENT_NOT_DUE",
  "AMOUNT_MISMATCH",
  "RATE_LIMITED",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorEnvelope = {
  status: number;
  code?: string;
  title: string;
  detail?: string;
};

export function isErrorEnvelope(data: unknown): data is ErrorEnvelope {
  if (typeof data !== "object" || data === null) return false;
  const value = data as Record<string, unknown>;
  return (
    typeof value.status === "number" &&
    typeof value.title === "string" &&
    (value.code === undefined || typeof value.code === "string") &&
    (value.detail === undefined || typeof value.detail === "string")
  );
}

export type ApiErrorKind = "http" | "network" | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly title: string | null;
  readonly detail: string | null;

  constructor(init: {
    kind: ApiErrorKind;
    status?: number | null;
    code?: string | null;
    title?: string | null;
    detail?: string | null;
    cause?: unknown;
  }) {
    super(init.detail ?? init.title ?? `ApiError (${init.kind})`, { cause: init.cause });
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.code = init.code ?? null;
    this.title = init.title ?? null;
    this.detail = init.detail ?? null;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    if (!error.response) return new ApiError({ kind: "network", cause: error });

    const { status, data } = error.response;
    if (isErrorEnvelope(data)) {
      return new ApiError({
        kind: "http",
        status,
        code: data.code,
        title: data.title,
        detail: data.detail,
        cause: error,
      });
    }
    return new ApiError({ kind: "http", status, cause: error });
  }

  return new ApiError({ kind: "unknown", cause: error });
}

export const ERROR_MESSAGES = {
  network: "Không kết nối được máy chủ, vui lòng thử lại.",
  server: "Có lỗi xảy ra, vui lòng thử lại sau.",
  rateLimited: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.",
  forbiddenTitle: "Bạn không có quyền xem trang này",
  forbiddenDetail: "Lỗi 403. Trang nằm ngoài phạm vi vai trò của bạn.",
} as const;

export function isForbiddenError(error: unknown) {
  const apiError = toApiError(error);
  return apiError.status === 403 && (apiError.code === null || apiError.code === "FORBIDDEN");
}

export function isRateLimitedError(error: unknown) {
  return toApiError(error).status === 429;
}

export function getErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.kind === "network") return ERROR_MESSAGES.network;
  if (apiError.kind === "unknown" || apiError.status === null || apiError.status >= 500) {
    return ERROR_MESSAGES.server;
  }
  if (isRateLimitedError(apiError)) return ERROR_MESSAGES.rateLimited;
  if (isForbiddenError(apiError)) return ERROR_MESSAGES.forbiddenTitle;

  return apiError.detail ?? apiError.title ?? ERROR_MESSAGES.server;
}

