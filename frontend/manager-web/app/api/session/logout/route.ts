import type { NextRequest } from "next/server";
import { handleLogout } from "@/lib/auth/session-server";

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
