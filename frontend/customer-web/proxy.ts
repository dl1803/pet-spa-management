import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { getSafeNextPath, ROUTES, withQuery } from "@/lib/routes";

const PUBLIC_PATHS: string[] = [ROUTES.login, ROUTES.register];

// Chỉ kiểm tra có cookie phiên hay không; tính hợp lệ do SessionGate kiểm tra bằng GET /me.
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL(withQuery(ROUTES.login, { next: `${pathname}${search}` }), request.url));
  }
  if (isPublic && hasSession) {
    const next = getSafeNextPath(searchParams.get("next"));
    return NextResponse.redirect(new URL(next ?? ROUTES.home, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};

