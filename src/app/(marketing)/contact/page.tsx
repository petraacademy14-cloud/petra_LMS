import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Mail, MapPin, MessageCircle, TriangleAlert } from "lucide-react";
import { sendContactEnquiry } from "@/app/actions/contact-enquiries";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Petra Academy in Awka or Nnewi, Anambra State, or request a school visit.",
};

type ContactPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const statusMessages = {
  sent: {
    kind: "success",
    message: "Your enquiry has been sent. We’ll get back to you within a day.",
  },
  invalid: {
    kind: "error",
    message: "Please check the highlighted information and try again.",
  },
  failed: {
    kind: "error",
    message: "We could not send your enquiry just now. Please try again shortly.",
  },
  unavailable: {
    kind: "error",
    message: "Email delivery is temporarily unavailable. Please contact the selected campus directly.",
  },
} as const;

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const { status } = await searchParams;
  const notice = status && status in statusMessages
    ? statusMessages[status as keyof typeof statusMessages]
    : null;

  return (
    <>
      <section className="page-hero simple-page-hero">
        <div className="marketing-shell">
          <span className="section-kicker">Enquiry / Admissions</span>
          <h1>We would be glad to hear from you.</h1>
          <p>Ask about admissions, school programs, portal access or arranging a visit at our Awka or Nnewi campus.</p>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell contact-grid">
          <article className="marketing-card contact-card"><MapPin size={25} /><h2>Visit us</h2><p>Our campuses and locations:<br />Awka and Nnewi, Anambra State</p><Link href="/book-visit">Book a school tour →</Link></article>
          <article className="marketing-card contact-card"><Mail size={25} /><h2>Send a message</h2><p>Select the appropriate campus and your enquiry will go directly to its team.</p><a href="#enquiry">Open enquiry form →</a></article>
          <article className="marketing-card contact-card"><CalendarDays size={25} /><h2>School hours</h2><p>Monday to Friday<br />7:30 AM–5:30 PM</p><Link href="/admissions">View admissions →</Link></article>
        </div>
      </section>

      <section className="marketing-section section-tint" id="enquiry">
        <div className="marketing-shell form-layout contact-form-layout">
          <div>
            <span className="section-kicker">General enquiry</span>
            <h2>How can we help?</h2>
            <p>For admission enquiries, include the student’s current class and the class you are applying for.</p>
            <div className="contact-prompt"><MessageCircle size={22} /><span>Choose Awka or Nnewi so your message reaches the correct campus team. We’ll get back to you within a day.</span></div>
          </div>
          <form action={sendContactEnquiry} className="marketing-form marketing-card">
            {notice && (
              <div className={notice.kind === "success" ? "success-banner" : "error-banner"} role={notice.kind === "error" ? "alert" : "status"}>
                {notice.kind === "success" ? <CheckCircle2 size={20} /> : <TriangleAlert size={20} />}
                {notice.message}
              </div>
            )}
            <label><span>Name *</span><input name="name" required minLength={2} maxLength={120} /></label>
            <label><span>Email address *</span><input name="email" required type="email" maxLength={254} /></label>
            <label><span>Phone number</span><input inputMode="tel" name="phone" maxLength={40} /></label>
            <label>
              <span>Preferred campus *</span>
              <select name="campus" required defaultValue="">
                <option value="" disabled>Select a campus</option>
                <option value="awka">Awka Campus</option>
                <option value="nnewi">Nnewi Campus</option>
              </select>
            </label>
            <label><span>Subject *</span><input name="subject" required minLength={3} maxLength={160} /></label>
            <label><span>Message *</span><textarea name="message" required minLength={10} maxLength={5000} rows={6} /></label>
            <label aria-hidden="true" style={{ display: "none" }}>
              <span>Website</span>
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <button className="button button-lg" type="submit">Send enquiry</button>
            <p className="form-note">Your message is delivered securely to the selected campus. We do not display campus inbox addresses in the form.</p>
          </form>
        </div>
      </section>
    </>
  );
}
