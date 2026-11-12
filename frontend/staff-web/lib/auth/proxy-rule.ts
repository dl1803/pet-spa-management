import { ROUTES } from "@/lib/routes";
import { buildLoginPath } from "./paths";

export type ProxyDecision = { action: "next" } | { action: "redirect"; to: string };

// Kiểm tra lạc quan (Frontend-Architecture 6.4): chỉ xem có cookie phiên hay không, không giải mã, không gọi backend.
export function decideProxy(input: { pathname: string; search: string; hasSession: boolean }): ProxyDecision {
  const isLoginPage = input.pathname === ROUTES.login;

  if (!isLoginPage && !input.hasSession) {
    return { action: "redirect", to: buildLoginPath({ next: input.pathname + input.search }) };
  }
  if (isLoginPage && input.hasSession) {
    return { action: "redirect", to: ROUTES.home };
  }
  return { action: "next" };
}
