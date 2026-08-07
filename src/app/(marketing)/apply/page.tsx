import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, LogIn } from "lucide-react";

export const metadata: Metadata = {
  title: "Apply",
  description: "Start or continue an application to Petra Academy.",
};

export default function ApplyPage() {
  return (
    <>
      <section className="page-hero simple-page-hero application-hero">
        <Image
          className="application-hero-image"
          src="/images/petra-admissions-transformation-transparent.webp"
          alt="A girl in everyday clothes meeting her future self as a Petra Academy student"
          fill
          priority
          sizes="100vw"
        />
        <div className="application-hero-shade" aria-hidden="true" />
        <div className="marketing-shell application-hero-shell">
          <div className="application-hero-content">
            <span className="section-kicker">Apply to Petra Academy</span>
            <h1>Begin your child’s admission journey.</h1>
            <p>Create an application, save your progress, view entrance fees, complete the assigned examination and track the decision.</p>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell application-entry-grid">
          <article className="marketing-card application-entry-card primary-entry-card">
            <span className="card-icon"><FileText size={27} /></span>
            <span className="section-kicker">New applicant</span>
            <h2>Start a new application</h2>
            <p>Create an applicant account and provide the student, guardian, placement and document details.</p>
            <ul className="check-list">
              <li>Save and continue later</li>
              <li>See entrance fee details</li>
              <li>Choose the approved online or onsite exam</li>
              <li>Track the admission decision</li>
            </ul>
            <Link className="button button-lg" href="/apply/start">Create application <ArrowRight size={18} /></Link>
          </article>

          <article className="marketing-card application-entry-card">
            <span className="card-icon"><LogIn size={27} /></span>
            <span className="section-kicker">Returning applicant</span>
            <h2>Continue your application</h2>
            <p>Sign in with the applicant email address and password used when the application was created.</p>
            <div className="application-status-list">
              <span><CheckCircle2 size={17} /> Complete or update a draft</span>
              <span><CheckCircle2 size={17} /> View payment and examination status</span>
              <span><CheckCircle2 size={17} /> Download admission documents</span>
            </div>
            <Link className="button button-secondary button-lg" href="/apply/login">Applicant login</Link>
          </article>
        </div>
      </section>
    </>
  );
}
