import type { NextRequest } from "next/server";
import { handleLogin } from "@/lib/auth/session-server";

export async function POST(request: NextRequest) {
  return handleLogin(request);
}
