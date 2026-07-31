import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, HeartHandshake, ShieldCheck, Sparkles, Users } from "lucide-react";

const programs = [
  { title: "Early Years", detail: "Creche and nursery experiences that make learning joyful, safe and purposeful.", icon: Sparkles },
  { title: "Primary School", detail: "Strong foundations in literacy, numeracy, science, creativity and character.", icon: BookOpen },
  { title: "Secondary School", detail: "Confident preparation for national examinations, leadership and life beyond school.", icon: GraduationCap },
];

const strengths = [
  ["Purposeful learning", "A clear academic programme with attention to every child's progress.", BookOpen],
  ["Character and confidence", "Values, responsibility and leadership are part of everyday school life.", ShieldCheck],
  ["Caring partnership", "Families, teachers and school leaders work together around each learner.", HeartHandshake],
] as const;

export default function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="marketing-shell hero-grid">
          <div className="hero-copy">
            <span className="section-kicker">Welcome to Petra Academy</span>
            <h1>A firm foundation for confident learners.</h1>
            <p>
              Petra Academy helps children grow in knowledge, character and confidence through caring teaching,
              strong academics and a vibrant school community.
            </p>
            <div className="hero-actions" aria-label="Homepage actions">
              <Link className="button button-lg" href="/apply">Apply now <ArrowRight size={18} /></Link>
              <Link className="button button-secondary button-lg" href="/book-visit">Book a visit</Link>
              <Link className="button button-quiet button-lg" href="/login">Login</Link>
            </div>
            <div className="hero-proof">
              <span><CheckCircle2 size={18} /> Nursery, primary and secondary</span>
              <span><CheckCircle2 size={18} /> Awka, Anambra State</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Petra Academy identity">
            <div className="hero-logo-card">
              <Image src="/petra-academy-logo.svg" alt="Petra Academy — Firm Foundation" width={520} height={520} priority />
            </div>
            <div className="hero-stat hero-stat-one"><strong>Whole-child</strong><span>learning and care</span></div>
            <div className="hero-stat hero-stat-two"><strong>Firm</strong><span>academic foundation</span></div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="marketing-shell trust-grid">
          <div><Users size={24} /><span><strong>Connected community</strong><small>School and families working together</small></span></div>
          <div><BookOpen size={24} /><span><strong>Strong academics</strong><small>Clear teaching and measurable progress</small></span></div>
          <div><ShieldCheck size={24} /><span><strong>Safe environment</strong><small>Care, structure and responsibility</small></span></div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell split-section">
          <div>
            <span className="section-kicker">About Petra</span>
            <h2>Education that prepares children for school, life and leadership.</h2>
          </div>
          <div>
            <p>
              We combine rigorous classroom learning with creativity, communication, good conduct and personal
              responsibility. Every learner should be known, supported and challenged to do their best.
            </p>
            <Link className="inline-cta" href="/about">Discover Petra Academy <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">Our programs</span>
            <h2>One school journey, built on strong foundations.</h2>
            <p>Age-appropriate learning from the early years through secondary school.</p>
          </div>
          <div className="program-grid">
            {programs.map(({ title, detail, icon: Icon }) => (
              <article className="marketing-card program-card" key={title}>
                <span className="card-icon"><Icon size={27} /></span>
                <h3>{title}</h3>
                <p>{detail}</p>
                <Link href="/programs">Learn more <ArrowRight size={16} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading compact-heading">
            <span className="section-kicker">Why Petra</span>
            <h2>What families can expect.</h2>
          </div>
          <div className="strength-grid">
            {strengths.map(([title, detail, Icon]) => (
              <article key={title}>
                <Icon size={26} />
                <h3>{title}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section admissions-preview">
        <div className="marketing-shell admissions-preview-grid">
          <div>
            <span className="section-kicker section-kicker-light">Admissions</span>
            <h2>Your Petra journey starts here.</h2>
            <p>Apply online, pay the entrance fees, choose an online or onsite entrance examination, and track the admission decision from one account.</p>
          </div>
          <ol className="admission-steps">
            <li><span>1</span><div><strong>Submit application</strong><small>Create an applicant account and complete the form.</small></div></li>
            <li><span>2</span><div><strong>Pay entrance fees</strong><small>View fee details and receive a payment receipt.</small></div></li>
            <li><span>3</span><div><strong>Take the examination</strong><small>Select the approved online or onsite option.</small></div></li>
          </ol>
          <Link className="button button-light button-lg" href="/apply">Start an application <ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell visit-banner">
          <div>
            <span className="section-kicker">Visit Petra Academy</span>
            <h2>See the school, meet our team and ask your questions.</h2>
            <p>Choose a convenient date and tell us the class you are interested in.</p>
          </div>
          <Link className="button button-lg" href="/book-visit">Book a visit <ArrowRight size={18} /></Link>
        </div>
      </section>
    </>
  );
}
