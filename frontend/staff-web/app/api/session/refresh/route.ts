import type { NextRequest } from "next/server";
import { handleRefresh } from "@/lib/auth/session-server";

export async function POST(request: NextRequest) {
  return handleRefresh(request);
}
