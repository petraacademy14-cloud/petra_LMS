import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { StudentImportForm } from "@/components/student-forms";
import { requirePermission } from "@/lib/dal";

export const metadata: Metadata = { title: "Import students" };

export default async function StudentImportPage() {
  await requirePermission("people.manage");
  return (
    <div>
      <PageHeading
        action={
          <Link className="button-secondary" href="/students">
            <ArrowLeft size={17} /> Student register
          </Link>
        }
        description="Upload Petra's records only after the full sheet passes validation. An invalid row prevents the entire import."
        eyebrow="Student management"
        title="Import CSV or Excel"
      />
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-5 md:p-6">
          <StudentImportForm />
        </section>
        <aside className="card p-5 md:p-6">
          <FileCheck2 className="text-[#d71920]" size={24} />
          <h2 className="mt-4 text-lg font-black">Prepare the file</h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-[#626b77]">
            <li>
              Download and retain the exact column names in the template.
            </li>
            <li>
              Use campus codes AWK or NNE and existing class, arm and academic
              session values.
            </li>
            <li>
              Leave admission_number blank to generate it automatically.
            </li>
            <li>
              Dates must use YYYY-MM-DD. Each student needs at least one
              guardian.
            </li>
          </ol>
          <a
            className="button-secondary mt-5 inline-flex"
            href="/api/students/import-template"
          >
            Download CSV template
          </a>
          <p className="mt-4 text-xs leading-5 text-[#7a828d]">
            The preview/test database must be used for Petra&apos;s first real
            import. Never upload live student data to a local or public sample
            environment.
          </p>
        </aside>
      </div>
    </div>
  );
}
