import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience: string;
  campusName: string | null;
};

function compact(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized;
}

export async function GET() {
  try {
    const announcements = await db.$queryRaw<AnnouncementRow[]>`
      SELECT
        announcement."id",
        announcement."title",
        announcement."body",
        announcement."audience"::text AS "audience",
        campus."name" AS "campusName"
      FROM "announcements" announcement
      JOIN "schools" school ON school."id" = announcement."schoolId"
      LEFT JOIN "campuses" campus ON campus."id" = announcement."campusId"
      WHERE school."slug" = 'petra-academy'
        AND announcement."status"::text = 'PUBLISHED'
        AND announcement."parentFacing" = TRUE
        AND announcement."audience"::text IN ('SCHOOL', 'CAMPUS')
        AND (
          announcement."scheduledFor" IS NULL
          OR announcement."scheduledFor" <= CURRENT_TIMESTAMP
        )
      ORDER BY COALESCE(announcement."publishedAt", announcement."createdAt") DESC
      LIMIT 5
    `;

    return NextResponse.json(
      {
        announcements: announcements.map((announcement) => ({
          id: announcement.id,
          title: compact(announcement.title, 90),
          body: compact(announcement.body, 220),
          scope:
            announcement.audience === "CAMPUS" && announcement.campusName
              ? `${announcement.campusName}: `
              : "All campuses: ",
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { announcements: [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
