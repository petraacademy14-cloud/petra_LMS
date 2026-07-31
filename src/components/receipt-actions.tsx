"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";

export function ReceiptActions({ paymentId }: { paymentId: string }) {
  return (
    <div className="receipt-actions flex flex-wrap gap-2">
      <button className="button" onClick={() => window.print()} type="button">
        <Printer size={17} /> Print receipt
      </button>
      <Link
        className="button button-secondary"
        href={`/api/receipts/${paymentId}/download`}
      >
        <Download size={17} /> Download PDF
      </Link>
    </div>
  );
}
