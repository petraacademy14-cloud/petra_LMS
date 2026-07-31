import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react";
import { createVisitBooking } from "@/app/actions/admissions";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Book a visit",
  description: "Request a convenient date to visit Petra Academy and meet the admissions team.",
};

type BookVisitPageProps = {
  searchParams: Promise<{ submitted?: string }>;
};

export default async function BookVisitPage({ searchParams }: BookVisitPageProps) {
  const { submitted } = await searchParams;
  const school = await db.school.findUnique({ where: { slug: "petra-academy" }, select: { id: true } });
  const campuses = school ? await db.campus.findMany({ where: { schoolId: school.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }) : [];

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

          <form action={createVisitBooking} className="marketing-form marketing-card">
            <div className="form-heading"><h2>Visit request</h2><p>Fields marked * are required.</p></div>
            {submitted && <div className="success-banner"><CheckCircle2 size={20} />Your visit request has been received. The admissions team will contact you to confirm it.</div>}
            <div className="field-grid">
              <label><span>Parent or guardian name *</span><input name="guardianName" required /></label>
              <label><span>Student name *</span><input name="studentName" required /></label>
              <label><span>Phone number *</span><input inputMode="tel" name="phone" required /></label>
              <label><span>Email address</span><input name="email" type="email" /></label>
              <label><span>Preferred campus</span><select name="campusId" defaultValue=""><option value="">Any campus</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name} — {campus.city}</option>)}</select></label>
              <label><span>Class of interest *</span><select name="classInterest" required defaultValue=""><option value="" disabled>Select a class</option><option>Creche</option><option>Nursery</option><option>Primary</option><option>Junior Secondary</option><option>Senior Secondary</option></select></label>
              <label><span>Preferred date *</span><input min={new Date().toISOString().slice(0, 10)} name="preferredDate" required type="date" /></label>
              <label><span>Preferred time *</span><input name="preferredTime" required type="time" /></label>
              <label className="field-full"><span>Notes</span><textarea name="notes" rows={5} placeholder="Tell us anything that will help us prepare for your visit." /></label>
            </div>
            <button className="button button-lg" type="submit">Request visit</button>
            <p className="form-note">Submitting this form creates a visit request. The appointment is confirmed only after the school contacts you.</p>
          </form>
        </div>
      </section>
    </>
  );
}
