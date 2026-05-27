import { NextResponse } from "next/server";

// Used by Docker HEALTHCHECK, Railway health gate, and load-balancer probes.
// Returns 200 + JSON as long as the Node process is alive.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    playwright: !!process.env.PLAYWRIGHT_BROWSERS_PATH,
    env: process.env.NODE_ENV ?? "unknown",
  });
}
