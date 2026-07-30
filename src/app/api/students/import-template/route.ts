import { requirePermission } from "@/lib/dal";
import { studentImportTemplateCsv } from "@/lib/student-import";

export async function GET() {
  await requirePermission("people.manage");
  return new Response(studentImportTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="petra-student-import-template.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
