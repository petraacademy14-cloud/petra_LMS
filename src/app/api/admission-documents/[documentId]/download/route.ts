import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getApplicantViewer } from "@/lib/applicant-auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { canAccessCampus } from "@/lib/scope";

type DocumentRow = {
  id: string;
  applicationId: string;
  schoolId: string;
  campusId: string | null;
  storageKey: string;
  fileName: string;
  contentType: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  const [document] = await db.$queryRaw<DocumentRow[]>`
    SELECT doc."id", doc."applicationId", a."schoolId", a."campusId",
      doc."storageKey", doc."fileName", doc."contentType"
    FROM "application_documents" doc
    JOIN "admission_applications" a ON a."id" = doc."applicationId"
    WHERE doc."id" = ${documentId}
    LIMIT 1
  `;
  if (!document) return new Response("Not found", { status: 404 });

  let authorized = false;
  const applicant = await getApplicantViewer();
  if (applicant?.applicationId === document.applicationId) {
    authorized = true;
  }

  if (!authorized) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user.id) {
      const membership = await db.schoolMembership.findFirst({
        where: {
          userId: session.user.id,
          schoolId: document.schoolId,
          status: "ACTIVE",
        },
        select: { role: true, campusId: true },
      });
      if (
        membership &&
        (hasPermission(membership.role, "admissions.read") ||
          hasPermission(membership.role, "people.read")) &&
        document.campusId &&
        canAccessCampus({
          role: membership.role,
          assignedCampusId: membership.campusId,
          targetCampusId: document.campusId,
        })
      ) {
        authorized = true;
      }
    }
  }

  if (!authorized) return new Response("Forbidden", { status: 403 });

  const supabaseUrl = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secret) {
    return new Response("Document storage is not configured", { status: 503 });
  }
  const encodedKey = document.storageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/admission-documents/${encodedKey}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        apikey: secret,
      },
      cache: "no-store",
    },
  );
  if (!response.ok) return new Response("Document not found", { status: 404 });

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `attachment; filename="${document.fileName.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
