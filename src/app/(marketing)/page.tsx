import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Baby,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Code2,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Mail,
  MapPin,
  Music,
  Phone,
  School,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const schoolSections = [
  {
    title: "Daycare",
    detail: "A safe, warm and stimulating environment for early care, play and discovery.",
    note: "Daycare & playgroup",
    icon: Baby,
  },
  {
    title: "Nursery",
    detail: "Child-centred learning that develops language, confidence, independence and curiosity.",
    note: "Early years foundation",
    icon: Sparkles,
  },
  {
    title: "Primary",
    detail: "Strong foundations in literacy, numeracy, science, technology, creativity and character.",
    note: "Core academic growth",
    icon: BookOpen,
  },
  {
    title: "College",
    detail: "Future-focused preparation for national and international examinations, leadership and life.",
    note: "Grades 7–12",
    icon: GraduationCap,
  },
] as const;

const curriculum = [
  {
    title: "NERDC Curriculum",
    detail: "The Nigerian Educational Research and Development Council framework anchors national learning standards.",
  },
  {
    title: "British National Curriculum",
    detail: "International academic structure enriches teaching, assessment and learner progression.",
  },
  {
    title: "Montessori Method",
    detail: "Hands-on, child-centred activities build independence, concentration and practical understanding.",
  },
  {
    title: "STEM Learning",
    detail: "Early exposure to science, technology, engineering and mathematics develops confident problem-solvers.",
  },
  {
    title: "Robotics and Coding",
    detail: "Technology skills begin from the primary years through coding, programming and practical digital projects.",
  },
  {
    title: "Weekly Leadership Development",
    detail: "Learners practise responsibility, communication, teamwork and purposeful leadership every week.",
  },
  {
    title: "Social and Emotional Intelligence",
    detail: "Team-based activities help learners understand themselves, relate well and work effectively with others.",
  },
] as const;

const strengths = [
  ["Personalised education", "Every learner is known, supported and challenged to make meaningful progress.", Users],
  ["Inclusive classrooms", "Thoughtful care and support help learners, including pupils with special educational needs, to thrive.", HeartHandshake],
  ["Technology-driven learning", "Digital classrooms, coding, programming, robotics and STEM are embedded in a practical learning culture.", BrainCircuit],
  ["Leadership and character", "Weekly leadership, etiquette and responsibility sessions prepare learners to influence with excellence.", ShieldCheck],
  ["Creative expression", "Music, orchestra, ballet and creative arts help learners discover and strengthen their talents.", Music],
  ["Beyond the classroom", "Excursions, local and international tours, camps and team activities broaden each learner's world.", Globe2],
] as const;

const offerGroups = [
  {
    title: "Academic and Technology",
    icon: Code2,
    items: [
      "Digital learning across the curriculum",
      "Google Workspace-supported learning",
      "STEM classes",
      "Coding and programming",
      "Robotics",
      "Cambridge examinations",
      "Creative art classes",
    ],
  },
  {
    title: "Leadership and Life Skills",
    icon: Lightbulb,
    items: ["Leadership classes", "Public speaking", "Entrepreneurial classes", "Etiquette classes", "Emotional and social intelligence"],
  },
  {
    title: "Sports and Performing Arts",
    icon: Music,
    items: ["Football", "Taekwondo and self-defence", "Traditional dance", "Ballet classes", "Music and orchestra lessons"],
  },
  {
    title: "Care and Enrichment",
    icon: HeartHandshake,
    items: ["Inclusive SEN support", "Boarding facilities", "Educational excursions and tours abroad", "Summer classes and camps"],
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="marketing-shell hero-grid">
          <div className="hero-copy">
            <span className="section-kicker">Welcome to Petra Academy</span>
            <h1>Preparing skilled and future-ready leaders.</h1>
            <p>
              We provide an inclusive, skill-based and technology-driven learning environment where children build
              strong academic foundations, practical abilities, character and leadership.
            </p>
            <p className="hero-motto">Firm foundation for building excellent leaders.</p>
            <div className="hero-actions" aria-label="Homepage actions">
              <Link className="button button-lg" href="/book-visit">
                Book a school visit <ArrowRight size={18} />
              </Link>
              <Link className="button button-secondary button-lg" href="/apply">Apply now</Link>
              <Link className="button button-quiet button-lg" href="/login">Login</Link>
            </div>
            <div className="hero-proof">
              <span><CheckCircle2 size={18} /> Daycare to College</span>
              <span><CheckCircle2 size={18} /> Awka and Nnewi campuses</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Petra Academy identity">
            <div className="hero-logo-card">
              <Image
                src="/brand/petra-logo.webp"
                alt="Petra Academy official logo — Firm Foundation"
                width={480}
                height={480}
                priority
                unoptimized
              />
            </div>
            <div className="hero-stat hero-stat-one"><strong>Skill-based</strong><span>learning for the real world</span></div>
            <div className="hero-stat hero-stat-two"><strong>Future-ready</strong><span>technology and leadership</span></div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Our principles">
        <div className="marketing-shell trust-grid">
          <div><ShieldCheck size={24} /><span><strong>Excellence</strong><small>High standards in learning, conduct and care</small></span></div>
          <div><Lightbulb size={24} /><span><strong>Innovation</strong><small>Creative, practical and technology-driven education</small></span></div>
          <div><Users size={24} /><span><strong>Leadership</strong><small>Confidence, responsibility and positive influence</small></span></div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell split-section">
          <div>
            <span className="section-kicker">Our principles</span>
            <h2>A school built on excellence, innovation and leadership.</h2>
          </div>
          <div>
            <p>
              Petra Academy combines academic structure, practical skills, technology, creativity and character
              development in one caring school community. Our learners are prepared not only to succeed in
              examinations, but also to think, communicate, create and lead with purpose.
            </p>
            <Link className="inline-cta" href="/about">Learn more about us <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">School sections</span>
            <h2>A complete learning journey, under one roof.</h2>
            <p>Purposeful, age-appropriate education from the earliest years through College.</p>
          </div>
          <div className="school-section-grid">
            {schoolSections.map(({ title, detail, note, icon: Icon }) => (
              <article className="marketing-card school-section-card" key={title}>
                <span className="card-icon"><Icon size={27} /></span>
                <h3>{title}</h3>
                <p>{detail}</p>
                <small>{note}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell curriculum-overview">
          <div className="curriculum-intro">
            <span className="section-kicker">Curriculum overview</span>
            <h2>A thoughtful blend of strong academics and practical learning.</h2>
            <p>
              Our curriculum draws from respected Nigerian and international frameworks while developing the skills,
              character and confidence every learner needs for the future.
            </p>
          </div>
          <div className="curriculum-list">
            {curriculum.map((item) => (
              <article className="curriculum-item" key={item.title}>
                <CheckCircle2 size={21} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <div className="section-heading compact-heading">
            <span className="section-kicker">Why Petra</span>
            <h2>What families can expect.</h2>
            <p>A broad, inclusive education designed around academic growth, practical ability and personal development.</p>
          </div>
          <div className="strength-grid strength-grid-six">
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

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">What we offer</span>
            <h2>Learning experiences that develop the whole child.</h2>
            <p>Academic depth, digital learning, technology, leadership, creativity, sport and enriching experiences work together.</p>
          </div>
          <div className="offer-grid">
            {offerGroups.map(({ title, icon: Icon, items }) => (
              <article className="marketing-card offer-card" key={title}>
                <span className="card-icon"><Icon size={27} /></span>
                <h3>{title}</h3>
                <ul>
                  {items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
          <Link className="inline-cta" href="/programs">See all programs <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="marketing-section admissions-preview">
        <div className="marketing-shell admissions-preview-grid">
          <div>
            <span className="section-kicker section-kicker-light">Our admissions process</span>
            <h2>Your Petra journey starts here.</h2>
            <p>
              Pay the application form fee, complete the application, take the entrance examination, receive the
              admission decision, pay school fees and submit the remaining documents from one secure applicant account.
            </p>
          </div>
          <ol className="admission-steps">
            <li><span>1</span><div><strong>Pay the application form fee</strong><small>Complete the approved payment step to unlock the online application form.</small></div></li>
            <li><span>2</span><div><strong>Complete the application</strong><small>Provide the learner, guardian, preferred campus and class information.</small></div></li>
            <li><span>3</span><div><strong>Take the entrance examination</strong><small>Follow the approved online or onsite examination process.</small></div></li>
            <li><span>4</span><div><strong>Pay school fees</strong><small>After an offer is made and accepted, pay the required school fees to secure enrolment.</small></div></li>
            <li><span>5</span><div><strong>Submit the remaining documents</strong><small>Accepted applicants provide the additional records required to complete enrolment.</small></div></li>
          </ol>
          <Link className="button button-light button-lg" href="/apply">Start an application <ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">Our campuses</span>
            <h2>Petra Academy in Awka and Nnewi.</h2>
            <p>Visit the campus that is most convenient for your family and experience the Petra learning environment.</p>
          </div>
          <div className="campus-grid">
            <article className="marketing-card campus-card">
              <span className="card-icon"><School size={27} /></span>
              <h3>Awka Campus</h3>
              <div className="campus-contact-list">
                <span><MapPin size={18} />#5 Abakaliki Street, Iyiagu Estate, Awka, Anambra State</span>
                <a href="tel:+2348033130456"><Phone size={18} />08033130456 · 08121997970</a>
                <a href="mailto:awkaadmin@petraacademy.co"><Mail size={18} />awkaadmin@petraacademy.co</a>
                <span><Users size={18} />@PetraAcademyAwka</span>
              </div>
            </article>
            <article className="marketing-card campus-card">
              <span className="card-icon"><School size={27} /></span>
              <h3>Nnewi Campus</h3>
              <div className="campus-contact-list">
                <span><MapPin size={18} />Lasel Junction, No. 11 Godwin Chris Street, off Ukpor Road, by Nwafor Junction, Umudim, Nnewi</span>
                <a href="tel:+2348033130456"><Phone size={18} />08033130456 · 08121997970</a>
                <a href="mailto:nnewiadmin@petraacademy.co"><Mail size={18} />nnewiadmin@petraacademy.co</a>
                <span><Users size={18} />@PetraAcademyAwka</span>
              </div>
            </article>
          </div>
          <div className="shared-hours">
            <Clock size={22} />
            <div>
              <strong>School and after-school hours</strong>
              <ul className="school-hours-list">
                <li><span>Regular school</span><strong>Monday–Friday, 7:30 AM–5:30 PM</strong></li>
                <li><span>After-school Coding</span><strong>Friday, 3:00 PM–5:00 PM</strong></li>
                <li><span>After-school Mathematics</span><strong>Saturday, 9:00 AM–12 noon</strong></li>
                <li><span>After-school Coding</span><strong>Saturday, 12 noon–4:00 PM</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell visit-banner">
          <div>
            <span className="section-kicker">Book a school visit</span>
            <h2>See the school, meet our team and discover the right learning journey.</h2>
            <p>Choose Awka or Nnewi, select a convenient date and tell us the section you are interested in.</p>
          </div>
          <Link className="button button-lg" href="/book-visit">Book a visit <ArrowRight size={18} /></Link>
        </div>
      </section>
    </>
  );
}
