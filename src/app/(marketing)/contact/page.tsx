import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Mail, MapPin, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Petra Academy in Awka, Anambra State, or request a school visit.",
};

export default function ContactPage() {
  return (
    <>
      <section className="page-hero simple-page-hero">
        <div className="marketing-shell">
          <span className="section-kicker">Contact Petra Academy</span>
          <h1>We would be glad to hear from you.</h1>
          <p>Ask about admissions, school programs, portal access or arranging a visit.</p>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell contact-grid">
          <article className="marketing-card contact-card"><MapPin size={25} /><h2>Visit us</h2><p>Petra Academy<br />Awka, Anambra State, Nigeria</p><Link href="/book-visit">Book a school tour →</Link></article>
          <article className="marketing-card contact-card"><Mail size={25} /><h2>Send a message</h2><p>Use the enquiry form and the appropriate school team will respond.</p><a href="#enquiry">Open enquiry form →</a></article>
          <article className="marketing-card contact-card"><CalendarDays size={25} /><h2>Office hours</h2><p>Monday to Friday<br />8:00 AM–4:00 PM</p><Link href="/admissions">View admissions →</Link></article>
        </div>
      </section>

      <section className="marketing-section section-tint" id="enquiry">
        <div className="marketing-shell form-layout contact-form-layout">
          <div>
            <span className="section-kicker">General enquiry</span>
            <h2>How can we help?</h2>
            <p>For admission enquiries, include the student’s current class and the class you are applying for.</p>
            <div className="contact-prompt"><MessageCircle size={22} /><span>Phone, email and WhatsApp details can be managed from the public website settings when the school confirms the official contacts.</span></div>
          </div>
          <form className="marketing-form marketing-card">
            <label><span>Name *</span><input name="name" required /></label>
            <label><span>Email address *</span><input name="email" required type="email" /></label>
            <label><span>Phone number</span><input inputMode="tel" name="phone" /></label>
            <label><span>Subject *</span><input name="subject" required /></label>
            <label><span>Message *</span><textarea name="message" required rows={6} /></label>
            <button className="button button-lg" type="submit">Send enquiry</button>
            <p className="form-note">Enquiry delivery will be enabled after the official school contact destination is configured.</p>
          </form>
        </div>
      </section>
    </>
  );
}
