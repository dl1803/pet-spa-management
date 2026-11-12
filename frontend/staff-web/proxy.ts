import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE_NAME } from "@/lib/auth/constants";
import { decideProxy } from "@/lib/auth/proxy-rule";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const decision = decideProxy({ pathname, search, hasSession: request.cookies.has(REFRESH_COOKIE_NAME) });

  if (decision.action === "redirect") return NextResponse.redirect(new URL(decision.to, request.url));
  return NextResponse.next();
}

// Bỏ qua /api (route handler tự xử lý), tệp tĩnh của Next và mọi đường dẫn có đuôi tệp (icon.svg…).
export const config = { matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"] };
