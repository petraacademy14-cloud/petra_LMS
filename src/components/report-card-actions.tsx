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
      <button className="button" onClick={() => window.print()} type="button"><Printer size={17} /> Print report card</button>
      <Link className="button button-secondary" href={`/api/report-cards/${studentId}/download?termId=${termId}`}><Download size={17} /> Download PDF</Link>
    </div>
  );
}
