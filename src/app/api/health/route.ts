import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  try {
    await db.$queryRawUnsafe("SELECT 1");
    return NextResponse.json(
      {
        status: "ok",
        service: "petra-lms",
        version:
          process.env.APP_VERSION ??
          process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
          "unknown",
        database: "reachable",
        responseTimeMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        service: "petra-lms",
        database: "unreachable",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
