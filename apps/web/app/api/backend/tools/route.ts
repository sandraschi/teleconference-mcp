import { NextRequest } from "next/server";
import { proxyBackend } from "@/lib/backend";

export async function GET(_request: NextRequest) {
  return proxyBackend("/api/v1/tools");
}
