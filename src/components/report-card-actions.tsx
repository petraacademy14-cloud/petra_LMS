"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";

export function ReportCardActions({
  studentId,
  termId,
}: {
  studentId: string;
  termId: string;
}) {
  return (
    <div className="receipt-actions flex flex-wrap gap-2">
      <a className="button" href={`/api/report-cards/${studentId}/download?termId=${termId}&inline=true`} target="_blank" rel="noopener noreferrer"><Printer size={17} /> Open PDF to print</a>
      <Link className="button button-secondary" href={`/api/report-cards/${studentId}/download?termId=${termId}`}><Download size={17} /> Download PDF</Link>
    </div>
  );
}
