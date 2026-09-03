import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Mail, MapPin, MessageCircle } from "lucide-react";
import { ContactEnquiryForm } from "@/components/marketing/contact-enquiry-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Petra Academy in Awka or Nnewi, Anambra State, or request a school visit.",
};

export default function ContactPage() {
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
          <ContactEnquiryForm />
        </div>
      </section>
    </>
  );
}
