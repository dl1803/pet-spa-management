import { ApiError } from "@/lib/api/errors";
import type { LoginRequest, RegisterRequest, RegisterResponse, Role } from "@/lib/api/types";

// Số điện thoại quyết định kết quả để thử từng trạng thái của màn.
const MOCK_PHONES = {
  duplicate: "0908112456", // Đăng ký: 409 DUPLICATE_CONTACT
  loginRejected: "0900000401", // Đăng nhập: 401 UNAUTHENTICATED
  staffAccount: "0900000002", // Đăng nhập thành công nhưng vai trò Staff
  managerAccount: "0900000003", // Đăng nhập thành công nhưng vai trò Manager
  validation: "0900000400", // 400 VALIDATION_ERROR
  rateLimited: "0900000429", // 429 RATE_LIMITED
  serverError: "0900000500", // 500
  network: "0900000000", // mất mạng
} as const;

const MOCK_DELAY_MS = 600;
const MOCK_USER_ID = "a0000000-0000-4000-8000-000000000001";

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// Lỗi dùng chung cho mọi thao tác xác thực mô phỏng.
function getCommonFailure(userName: string): ApiError | null {
  switch (userName) {
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
    default:
      return null;
  }
}

export async function mockRegister(request: RegisterRequest): Promise<RegisterResponse> {
  await wait();

  const failure = getCommonFailure(request.userName);
  if (failure) throw failure;

  if (request.userName === MOCK_PHONES.duplicate) {
    throw new ApiError({
      kind: "http",
      status: 409,
      code: "DUPLICATE_CONTACT",
      title: "Thông tin liên hệ đã được sử dụng",
      detail: "Thông tin liên hệ đã được sử dụng.",
    });
  }

  return { userId: MOCK_USER_ID };
}

export type MockLoginResult = { role: Role };

export async function mockLogin(request: LoginRequest): Promise<MockLoginResult> {
  await wait();

  const failure = getCommonFailure(request.userName);
  if (failure) throw failure;

  if (request.userName === MOCK_PHONES.loginRejected) {
    throw new ApiError({
      kind: "http",
      status: 401,
      code: "UNAUTHENTICATED",
      title: "Chưa xác thực",
      detail: "Thông tin đăng nhập không đúng.",
    });
  }
  if (request.userName === MOCK_PHONES.staffAccount) return { role: "Staff" };
  if (request.userName === MOCK_PHONES.managerAccount) return { role: "Manager" };

  return { role: "Customer" };
}

