import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Heart, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About us",
  description: "Learn about Petra Academy's mission, values and approach to educating confident learners.",
};

const values = [
  ["Academic excellence", "Clear teaching, purposeful practice and high expectations for every learner.", BookOpen],
  ["Character", "Integrity, responsibility, respect and service shape daily school life.", ShieldCheck],
  ["Care", "Children learn best when they are safe, known, encouraged and supported.", Heart],
  ["Partnership", "Teachers and families work together with open, timely communication.", Users],
] as const;

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="marketing-shell page-hero-grid">
          <div>
            <span className="section-kicker">About Petra Academy</span>
            <h1>Rooted in purpose. Growing confident learners.</h1>
            <p>Petra Academy exists to give children a firm academic, moral and social foundation for a meaningful future.</p>
          </div>
          <Image className="page-hero-logo" src="/petra-academy-logo.svg" alt="Petra Academy logo" width={320} height={320} />
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell split-section">
          <div>
            <span className="section-kicker">Our mission</span>
            <h2>To educate the whole child with knowledge, values and confidence.</h2>
          </div>
          <div>
            <p>Our classrooms combine strong subject knowledge with curiosity, creativity, communication and good conduct. We want each learner to understand what they are learning, apply it confidently and grow into a responsible member of the community.</p>
            <p>Petra Academy serves families through a structured school experience, caring teachers, transparent communication and steady attention to student progress.</p>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <div className="section-heading compact-heading">
            <span className="section-kicker">Our values</span>
            <h2>What guides us every day.</h2>
          </div>
          <div className="value-grid">
            {values.map(([title, detail, Icon]) => (
              <article className="marketing-card value-card" key={title}>
                <span className="card-icon"><Icon size={25} /></span>
                <h3>{title}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell visit-banner">
          <div>
            <span className="section-kicker">Meet Petra</span>
            <h2>The best way to understand our school is to visit.</h2>
            <p>Tour the learning environment and speak with our admissions team.</p>
          </div>
          <Link className="button button-lg" href="/book-visit">Book a visit <ArrowRight size={18} /></Link>
        </div>
      </section>
    </>
  );
}
