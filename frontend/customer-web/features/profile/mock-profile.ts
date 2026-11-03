import { ApiError } from "@/lib/api/errors";
import type { Me, UpdateMeRequest } from "@/lib/api/types";

export const PROFILE_QUERY_KEY = ["me"] as const;

// Số điện thoại gửi lên quyết định kết quả để thử từng trạng thái của màn.
const MOCK_PHONES = {
  duplicate: "0908112456", // Lưu: 409 DUPLICATE_CONTACT
  validation: "0900000400", // Lưu: 400 VALIDATION_ERROR
  unauthenticated: "0900000401", // Lưu: 401 UNAUTHENTICATED
  rateLimited: "0900000429", // Lưu: 429 RATE_LIMITED
  serverError: "0900000500", // Lưu: 500
  network: "0900000000", // Lưu: mất mạng
  reloadUnauthenticated: "0900000411", // Lưu được, tải lại GET /me trả 401
  reloadServerError: "0900000511", // Lưu được, tải lại GET /me trả 500
} as const;

const MOCK_DELAY_MS = 600;

// Hồ sơ giữ trong bộ nhớ trình duyệt; tải lại trang thì về dữ liệu ban đầu.
let currentMe: Me = {
  userId: "a0000000-0000-4000-8000-000000000001",
  userName: "0903412678",
  role: "Customer",
  fullName: "Trần Minh Anh",
  phone: "0903412678",
  email: "minhanh.tran@gmail.com",
};

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function getUpdateFailure(phone: string): ApiError | null {
  switch (phone) {
    case MOCK_PHONES.network:
      return new ApiError({ kind: "network" });
    case MOCK_PHONES.serverError:
      return new ApiError({ kind: "http", status: 500 });
    case MOCK_PHONES.rateLimited:
      return new ApiError({
        kind: "http",
        status: 429,
        code: "RATE_LIMITED",
        title: "Vượt giới hạn tần suất",
        detail: "Bạn đã thử quá nhiều lần.",
      });
    case MOCK_PHONES.validation:
      return new ApiError({
        kind: "http",
        status: 400,
        code: "VALIDATION_ERROR",
        title: "Dữ liệu không hợp lệ",
        detail: "Dữ liệu không hợp lệ, vui lòng kiểm tra lại thông tin.",
      });
    case MOCK_PHONES.unauthenticated:
      return new ApiError({
        kind: "http",
        status: 401,
        code: "UNAUTHENTICATED",
        title: "Chưa xác thực",
        detail: "Phiên đăng nhập đã hết hạn.",
      });
    case MOCK_PHONES.duplicate:
      return new ApiError({
        kind: "http",
        status: 409,
        code: "DUPLICATE_CONTACT",
        title: "Thông tin liên hệ đã được sử dụng",
        detail: "Thông tin liên hệ đã được sử dụng.",
      });
    default:
      return null;
  }
}

export async function mockGetMe(): Promise<Me> {
  await wait();

  if (currentMe.phone === MOCK_PHONES.reloadUnauthenticated) {
    throw new ApiError({
      kind: "http",
      status: 401,
      code: "UNAUTHENTICATED",
      title: "Chưa xác thực",
      detail: "Phiên đăng nhập đã hết hạn.",
    });
  }
  if (currentMe.phone === MOCK_PHONES.reloadServerError) {
    throw new ApiError({ kind: "http", status: 500 });
  }

  return { ...currentMe };
}

export async function mockUpdateMe(request: UpdateMeRequest): Promise<void> {
  await wait();

  const phone = request.phone ?? currentMe.userName;
  const failure = getUpdateFailure(phone);
  if (failure) throw failure;

  currentMe = {
    ...currentMe,
    userName: phone,
    phone,
    fullName: request.fullName ?? currentMe.fullName,
    email: request.email ?? null,
  };
}

