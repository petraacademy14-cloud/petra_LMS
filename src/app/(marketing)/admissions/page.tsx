import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, CreditCard, FileCheck2, MonitorCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Admissions",
  description: "Understand the Petra Academy application, entrance fee, examination and admission decision process.",
};

const steps = [
  ["Complete the application", "Create an applicant account, provide the student and guardian details, and upload the requested documents.", ClipboardList],
  ["Pay the entrance fees", "View the entrance form and examination fee details, select an available payment method, and keep the receipt.", CreditCard],
  ["Take the entrance examination", "Eligible applicants can be scheduled for an approved online or onsite entrance examination.", MonitorCheck],
  ["Receive the decision", "Track the application status and access the admission letter and next steps when an offer is made.", FileCheck2],
] as const;

export default function AdmissionsPage() {
  return (
    <>
      <section className="page-hero simple-page-hero">
        <div className="marketing-shell">
          <span className="section-kicker">Admissions</span>
          <h1>A clear application journey for every family.</h1>
          <p>Apply, see entrance fee details, complete the examination process and track the admission decision online.</p>
          <div className="hero-actions">
            <Link className="button button-lg" href="/apply">Apply now <ArrowRight size={18} /></Link>
            <Link className="button button-secondary button-lg" href="/book-visit">Book a visit</Link>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">How it works</span>
            <h2>Four simple stages.</h2>
          </div>
          <div className="admissions-grid">
            {steps.map(([title, detail, Icon], index) => (
              <article className="marketing-card admission-card" key={title}>
                <div className="admission-card-top"><span>{index + 1}</span><Icon size={24} /></div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell split-section">
          <div>
            <span className="section-kicker">Entrance examination</span>
            <h2>Online and onsite options.</h2>
          </div>
          <div>
            <p>Petra Academy can assign an applicant to either an online or onsite entrance examination. The approved mode, date, time, venue and instructions will appear in the applicant portal after the entrance payment is confirmed.</p>
            <ul className="check-list">
              <li>Online examinations include a timer and automatic submission.</li>
              <li>Onsite candidates receive a printable examination slip.</li>
              <li>Results and admission decisions are released through the portal.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell admissions-note">
          <CheckCircle2 size={28} />
          <div><h2>Ready to begin?</h2><p>Create an application account and save your progress as you complete the form.</p></div>
          <Link className="button" href="/apply">Start application</Link>
        </div>
      </section>
    </>
  );
}
