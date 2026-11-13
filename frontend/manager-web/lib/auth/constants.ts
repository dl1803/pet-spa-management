// Dùng chung cho route handler (server), proxy.ts và trình duyệt: không import gì của React.

// Tên riêng cho web quản lý: khi chạy cục bộ, cookie của localhost dùng chung cho mọi cổng nên không được trùng tên với web khác.
export const REFRESH_COOKIE_NAME = "ps_manager_rt";
// Thời hạn cookie bằng thời hạn refresh token của backend (Jwt__RefreshTokenDays = 7).
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const SESSION_API_BASE = "/api/session";

export const LOGIN_FAILED_MESSAGE = "Thông tin đăng nhập không đúng.";
export const LOGIN_WRONG_WEB_MESSAGE = "Tài khoản không có quyền truy cập web này";
export const SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";

// Giá trị của tham số ?reason= trên /dang-nhap.
export const LOGIN_REASON_EXPIRED = "expired";
