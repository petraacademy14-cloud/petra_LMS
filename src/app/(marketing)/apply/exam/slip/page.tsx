import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, MapPin, Printer } from "lucide-react";
import { requireApplicant } from "@/lib/applicant-auth";
import { ensureApplicantExamRegistration } from "@/lib/applicant-exam";

export const metadata: Metadata = { title: "Entrance examination slip" };

export default async function EntranceExamSlipPage() {
  const viewer = await requireApplicant();
  const registration = await ensureApplicantExamRegistration(viewer);
  if (!registration || registration.mode !== "ONSITE") redirect("/apply/exam");

  return (
    <section className="marketing-section exam-slip-section">
      <div className="marketing-shell exam-slip-shell">
        <article className="marketing-card printable-exam-slip">
          <header>
            <div>
              <span className="section-kicker">Petra Academy</span>
              <h1>Entrance examination slip</h1>
              <p>Present this slip at the examination venue.</p>
            </div>
            <strong>{registration.candidateNumber}</strong>
          </header>
          <div className="exam-slip-grid">
            <div><span>Application number</span><strong>{viewer.applicationNumber}</strong></div>
            <div><span>Candidate number</span><strong>{registration.candidateNumber}</strong></div>
            <div><span>Seat number</span><strong>{registration.seatNumber ?? "To be assigned"}</strong></div>
            <div><span>Campus</span><strong>{registration.campusName}</strong></div>
            <div><span>Class</span><strong>{registration.className}</strong></div>
            <div><span>Paper</span><strong>{registration.title}</strong></div>
          </div>
          <div className="exam-slip-schedule">
            <CalendarClock size={25} />
            <div><span>Date and time</span><strong>{registration.scheduledAt?.toLocaleString("en-NG")}</strong></div>
            <MapPin size={25} />
            <div><span>Venue</span><strong>{registration.venue}</strong></div>
          </div>
          <div className="exam-slip-instructions">
            <strong>Instructions</strong>
            <p>{registration.instructions}</p>
            <p>Arrive at least 30 minutes before the scheduled time with this slip and an accepted identification document.</p>
          </div>
        </article>
        <div className="exam-slip-actions">
          <Link className="button" href="/api/exam-slips/download"><Printer size={17} /> Download PDF</Link>
          <Link className="button button-secondary" href="/apply/exam">Back to examination</Link>
        </div>
      </div>
    </section>
  );
}
