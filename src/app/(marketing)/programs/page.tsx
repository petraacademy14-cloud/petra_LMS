import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Baby, BookOpen, GraduationCap, School } from "lucide-react";

export const metadata: Metadata = {
  title: "Programs",
  description: "Explore Petra Academy's early years, primary and secondary school programs.",
};

const programs = [
  { stage: "Creche & Nursery", ages: "Early years", icon: Baby, copy: "A caring, language-rich environment where young children learn through guided play, routines, movement, stories and exploration.", highlights: ["Early literacy and numeracy", "Social and emotional development", "Creative and physical development"] },
  { stage: "Primary School", ages: "Foundational years", icon: BookOpen, copy: "Structured teaching that builds fluent readers, confident problem-solvers and curious learners across the core curriculum.", highlights: ["Literacy, numeracy and science", "Technology and creative expression", "Character and communication"] },
  { stage: "Junior Secondary", ages: "JSS 1–3", icon: School, copy: "A broad curriculum that helps students deepen subject knowledge, develop independent study habits and discover their strengths.", highlights: ["Strong subject foundations", "Continuous assessment", "Guidance and leadership opportunities"] },
  { stage: "Senior Secondary", ages: "SSS 1–3", icon: GraduationCap, copy: "Focused academic preparation, responsible study and career awareness for national examinations and life after secondary school.", highlights: ["Examination preparation", "Subject pathway support", "University and career readiness"] },
] as const;

export default function ProgramsPage() {
  return (
    <>
      <section className="page-hero simple-page-hero">
        <div className="marketing-shell">
          <span className="section-kicker">Our programs</span>
          <h1>Learning designed for every stage of a child’s journey.</h1>
          <p>From the earliest years to secondary school, Petra Academy provides clear progression, caring support and meaningful challenge.</p>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell program-list">
          {programs.map(({ stage, ages, icon: Icon, copy, highlights }) => (
            <article className="program-row" key={stage}>
              <div className="program-row-title">
                <span className="card-icon"><Icon size={27} /></span>
                <small>{ages}</small>
                <h2>{stage}</h2>
              </div>
              <div>
                <p>{copy}</p>
                <ul className="check-list">
                  {highlights.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell visit-banner">
          <div>
            <span className="section-kicker">Find the right class</span>
            <h2>Speak with our admissions team.</h2>
            <p>Tell us your child’s age and current class, and we will guide you through the next step.</p>
          </div>
          <Link className="button button-lg" href="/apply">Apply now <ArrowRight size={18} /></Link>
        </div>
      </section>
    </>
  );
}
