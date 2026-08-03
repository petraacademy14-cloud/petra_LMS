import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowRightLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Fingerprint,
  GraduationCap,
  MonitorCheck,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admissions",
  description:
    "Understand the Petra Academy application, entrance examination, school-fee payment and required-document process.",
};

const steps = [
  [
    "Pay the application form fee",
    "Complete the approved payment step to unlock the online application form and begin the admissions process.",
    CreditCard,
  ],
  [
    "Complete the application",
    "Create an applicant account and provide the learner, guardian, preferred campus and class information.",
    ClipboardList,
  ],
  [
    "Take the entrance examination",
    "Eligible applicants are scheduled for an approved online or onsite entrance examination.",
    MonitorCheck,
  ],
  [
    "Pay school fees",
    "After an admission offer is made and accepted, pay the required school fees to secure enrolment.",
    CreditCard,
  ],
  [
    "Submit the remaining documents",
    "Provide the required records and photographs so the school can complete the learner's admission file.",
    FileText,
  ],
] as const;

const requiredDocuments = [
  {
    title: "Copy of birth certificate",
    detail: "Official proof of your child's date of birth.",
    icon: FileText,
  },
  {
    title: "Copy of immunisation card",
    detail: "Current vaccination and immunisation records.",
    icon: ShieldCheck,
  },
  {
    title: "Copy of last academic year's result",
    detail: "The learner's most recent school report or academic transcript.",
    icon: GraduationCap,
  },
  {
    title: "Transfer letter",
    detail: "Required when the learner is transferring from another school.",
    icon: ArrowRightLeft,
  },
  {
    title: "Two passport photographs",
    detail: "Two recent passport-size photographs of the learner.",
    icon: Camera,
  },
  {
    title: "Copy of the learner's NIN",
    detail: "The learner's National Identification Number, where available.",
    icon: Fingerprint,
    optional: true,
  },
] as const;

export default function AdmissionsPage() {
  return (
    <>
      <section className="page-hero simple-page-hero">
        <div className="marketing-shell">
          <span className="section-kicker">Admissions</span>
          <h1>A clear application journey for every family.</h1>
          <p>
            Pay the application form fee, complete the application, take the entrance examination, pay school fees and
            submit the remaining documents through one guided admissions process.
          </p>
          <div className="hero-actions">
            <Link className="button button-lg" href="/apply">
              Apply now <ArrowRight size={18} />
            </Link>
            <Link className="button button-secondary button-lg" href="/book-visit">
              Book a visit
            </Link>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">How it works</span>
            <h2>Five clear stages.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map(([title, detail, Icon], index) => (
              <article className="marketing-card admission-card" key={title}>
                <div className="admission-card-top">
                  <span>{index + 1}</span>
                  <Icon size={24} />
                </div>
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
            <p>
              Petra Academy can assign an applicant to either an online or onsite entrance examination. The approved
              mode, date, time, venue and instructions will appear in the applicant portal after the entrance payment is
              confirmed.
            </p>
            <ul className="check-list">
              <li>Online examinations include a timer and automatic submission.</li>
              <li>Onsite candidates receive a printable examination slip.</li>
              <li>Results and admission decisions are released through the portal.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">Required Documents</span>
            <h2>What you need to complete the admission process.</h2>
            <p>
              To finalise your child&apos;s admission into Petra Academy, please prepare the following documents for
              submission when requested.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {requiredDocuments.map(({ title, detail, icon: Icon, optional }) => (
              <article className="marketing-card flex gap-5 p-7" key={title}>
                <span className="card-icon shrink-0">
                  <Icon size={25} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-[var(--font-merriweather)] text-xl leading-tight">{title}</h3>
                    {optional ? (
                      <small className="rounded-full bg-[#fff4f4] px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] text-[#a50e12]">
                        If available
                      </small>
                    ) : null}
                  </div>
                  <p className="mt-3 leading-7 text-[#666b73]">{detail}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-[#e7e3e3] bg-[#fbf8f6] p-6 text-[#555b63]">
            <CheckCircle2 className="mt-1 shrink-0 text-[#a50e12]" size={23} />
            <p className="leading-7">
              Clear, readable digital copies can be uploaded through the applicant portal. The admissions team may ask
              to sight the original documents before enrolment is completed.
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell admissions-note">
          <CheckCircle2 size={28} />
          <div>
            <h2>Ready to begin?</h2>
            <p>Create an application account and save your progress as you complete the admissions process.</p>
          </div>
          <Link className="button" href="/apply">
            Start application
          </Link>
        </div>
      </section>
    </>
  );
}
