import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Upload } from "lucide-react";
import { uploadApplicationDocument } from "@/app/actions/admissions";
import { isEditableApplication, type ApplicationStatus } from "@/lib/admissions-rules";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Application documents" };

type DocumentRow = {
  id: string;
  name: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
};

type DocumentsPageProps = {
  searchParams: Promise<{ uploaded?: string }>;
};

export default async function ApplicationDocumentsPage({ searchParams }: DocumentsPageProps) {
  const viewer = await requireApplicant();
  const { uploaded } = await searchParams;
  const [formPayment] = await db.$queryRaw<Array<{ amount: unknown; verified: unknown }>>`
    SELECT c."amount",
      COALESCE(SUM(CASE WHEN p."status"='VERIFIED' THEN p."amount" ELSE 0 END), 0) AS "verified"
    FROM "applicant_charges" c
    LEFT JOIN "applicant_payments" p ON p."chargeId"=c."id"
    WHERE c."applicationId"=${viewer.applicationId} AND c."kind"='FORM'
    GROUP BY c."id"
    LIMIT 1
  `;
  if (!formPayment || Number(formPayment.amount) - Number(formPayment.verified) > 0) {
    redirect("/apply/payment");
  }
  const [application] = await db.$queryRaw<Array<{ status: ApplicationStatus }>>`
    SELECT "status"::text AS "status"
    FROM "admission_applications"
    WHERE "id" = ${viewer.applicationId} AND "accountId" = ${viewer.id}
    LIMIT 1
  `;
  if (!application) throw new Error("NOT_FOUND:APPLICATION");
  const documents = await db.$queryRaw<DocumentRow[]>`
    SELECT "id", "name", "fileName", "contentType", "sizeBytes", "createdAt"
    FROM "application_documents"
    WHERE "applicationId" = ${viewer.applicationId}
    ORDER BY "createdAt" DESC
  `;
  const editable = isEditableApplication(application.status);

  return (
    <section className="marketing-section applicant-workspace-section">
      <div className="marketing-shell narrow-form-shell">
        <Link className="back-link" href="/apply/application"><ArrowLeft size={17} /> Back to application</Link>
        <div className="form-intro">
          <span className="section-kicker">Application documents</span>
          <h1>Upload supporting records.</h1>
          <p>Upload clear PDF, JPEG or PNG files. Each document must be no larger than 5 MB.</p>
        </div>
        {uploaded && <div className="success-banner"><CheckCircle2 size={20} />Document uploaded securely.</div>}

        <div className="application-workspace-grid document-workspace-grid">
          <div className="marketing-card document-list-card">
            <div className="form-heading"><h2>Uploaded documents</h2><span>{documents.length} file{documents.length === 1 ? "" : "s"}</span></div>
            {documents.length ? (
              <div className="document-list">
                {documents.map((document) => (
                  <div className="document-list-item" key={document.id}>
                    <FileText size={22} />
                    <div><strong>{document.name}</strong><span>{document.fileName} · {(document.sizeBytes / 1024).toFixed(0)} KB</span></div>
                    <time>{document.createdAt.toLocaleDateString("en-NG")}</time>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state">No documents have been uploaded yet.</div>}
          </div>

          <aside className="marketing-card upload-card">
            <span className="card-icon"><Upload size={24} /></span>
            <h2>Add document</h2>
            {editable ? (
              <form action={uploadApplicationDocument} className="marketing-form upload-document-form">
                <label><span>Document type *</span><select name="name" required defaultValue=""><option value="" disabled>Select document</option><option value="Passport photograph">Passport photograph</option><option value="Birth certificate">Birth certificate</option><option value="Previous school result">Previous school result</option><option value="Medical information">Medical information</option><option value="Other supporting document">Other supporting document</option></select></label>
                <label><span>Choose file *</span><input accept=".pdf,.jpg,.jpeg,.png" name="file" required type="file" /></label>
                <button className="button" type="submit"><Upload size={17} /> Upload document</button>
              </form>
            ) : <p>The application has been submitted, so its document set is locked.</p>}
          </aside>
        </div>
      </div>
    </section>
  );
}
