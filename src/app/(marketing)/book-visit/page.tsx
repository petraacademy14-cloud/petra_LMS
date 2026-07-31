import type { Metadata } from "next";
import { CalendarDays, Clock, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Book a visit",
  description: "Request a convenient date to visit Petra Academy and meet the admissions team.",
};

export default function BookVisitPage() {
  return (
    <>
      <section className="page-hero simple-page-hero">
        <div className="marketing-shell">
          <span className="section-kicker">Book a visit</span>
          <h1>Come and experience Petra Academy.</h1>
          <p>Tell us about your family and preferred visit time. The admissions team will confirm the appointment.</p>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell form-layout">
          <aside className="visit-info">
            <h2>What to expect</h2>
            <div><MapPin size={21} /><span><strong>Tour the school</strong><small>See classrooms and shared learning spaces.</small></span></div>
            <div><CalendarDays size={21} /><span><strong>Meet admissions</strong><small>Discuss placement, the application and entrance examination.</small></span></div>
            <div><Clock size={21} /><span><strong>Plan for 30–45 minutes</strong><small>Allow time for your questions and next steps.</small></span></div>
          </aside>

          <form className="marketing-form marketing-card">
            <div className="form-heading"><h2>Visit request</h2><p>Fields marked * are required.</p></div>
            <div className="field-grid">
              <label><span>Parent or guardian name *</span><input name="guardianName" required /></label>
              <label><span>Student name *</span><input name="studentName" required /></label>
              <label><span>Phone number *</span><input inputMode="tel" name="phone" required /></label>
              <label><span>Email address</span><input name="email" type="email" /></label>
              <label><span>Class of interest *</span><select name="classInterest" required defaultValue=""><option value="" disabled>Select a class</option><option>Creche</option><option>Nursery</option><option>Primary</option><option>Junior Secondary</option><option>Senior Secondary</option></select></label>
              <label><span>Preferred date *</span><input name="preferredDate" required type="date" /></label>
              <label><span>Preferred time *</span><input name="preferredTime" required type="time" /></label>
              <label className="field-full"><span>Notes</span><textarea name="notes" rows={5} placeholder="Tell us anything that will help us prepare for your visit." /></label>
            </div>
            <button className="button button-lg" type="submit">Request visit</button>
            <p className="form-note">Submission storage and admin confirmation are being connected in the admissions backend sprint.</p>
          </form>
        </div>
      </section>
    </>
  );
}
