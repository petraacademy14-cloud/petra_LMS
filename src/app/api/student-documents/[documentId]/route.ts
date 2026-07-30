import { NextResponse } from "next/server";
import { getViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const viewer = await getViewer();
  if (!hasPermission(viewer.membership.role, "students.read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { documentId } = await params;
  const document = await db.studentDocument.findFirst({
    where: {
      id: documentId,
      student: {
        schoolId: viewer.membership.schoolId,
        ...(viewer.membership.role === "OWNER"
          ? {}
          : { campusId: viewer.membership.campusId ?? "__none__" }),
      },
    },
  });
  if (!document) return new NextResponse("Not found", { status: 404 });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secret) return new NextResponse("Storage unavailable", { status: 503 });
  const bucket = process.env.SUPABASE_STUDENT_DOCUMENT_BUCKET ?? "student-documents";
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/authenticated/${bucket}/${document.storagePath}`,
    { headers: { Authorization: `Bearer ${secret}`, apikey: secret } },
  );
  if (!response.ok || !response.body) return new NextResponse("File unavailable", { status: 502 });
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${safeFileName(document.originalName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function safeFileName(value: string) {
  return value.replace(/[\r\n"]/g, "_");
}

