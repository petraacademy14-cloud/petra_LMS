import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Baby,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Code2,
  Drama,
  Gamepad2,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Music2,
  Palette,
  Puzzle,
  Rocket,
  School,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Our Programs",
  description:
    "Explore Petra Academy programs across Daycare, Nursery, Primary, College, STEM, Coding, exam preparation, clubs, leadership and inclusive education.",
};

const schoolSections = [
  {
    title: "Daycare",
    note: "Care, play and discovery",
    detail:
      "A safe, warm and stimulating environment where children build confidence through guided play, routines, movement and early discovery.",
    icon: Baby,
  },
  {
    title: "Nursery",
    note: "Strong early foundations",
    detail:
      "A child-centred programme that develops early reading, numeracy, communication, independence, creativity and social confidence.",
    icon: Sparkles,
  },
  {
    title: "Primary",
    note: "Knowledge, skills and character",
    detail:
      "Structured learning across literacy, numeracy, science, technology, arts and leadership, with practical experiences that make learning meaningful.",
    icon: BookOpen,
  },
  {
    title: "College",
    note: "Grades 7–12",
    detail:
      "Focused academic development, subject depth, examination readiness, technology, leadership and guidance for life beyond secondary school.",
    icon: GraduationCap,
  },
] as const;

const curriculumFeatures = [
  ["STEM from the early years", "Early exposure to Science, Technology, Engineering and Mathematics through practical, age-appropriate projects.", BrainCircuit],
  ["Robotics and Coding", "Coding, programming, robotics and digital literacy begin from the primary years and grow with each learner.", Code2],
  ["Weekly Leadership", "Leadership development sessions strengthen confidence, communication, responsibility and positive influence.", Target],
  ["Social and Emotional Intelligence", "Team-based activities build self-awareness, empathy, collaboration and healthy relationships.", HeartHandshake],
] as const;

const signaturePrograms = [
  {
    title: "Champions Preparatory School",
    kicker: "Examination preparation",
    detail:
      "Intensive, focused preparation for learners sitting major national and international examinations. Experienced tutors provide structured revision, personalised coaching, practice tests and progress guidance.",
    icon: Trophy,
    highlights: ["WAEC", "NECO", "JAMB", "NABTEB", "BECE", "Common Entrance", "IELTS", "TOEFL", "SAT", "GRE", "MAT"],
  },
  {
    title: "Petra Tech Hub",
    kicker: "Technology and digital skills",
    detail:
      "Our dedicated coding and technology centre develops practical confidence in Python, Artificial Intelligence, web development, digital literacy and problem-solving through project-based learning.",
    icon: Rocket,
    highlights: ["Python", "Artificial Intelligence", "Web development", "Digital literacy", "Coding projects", "After-school sessions"],
  },
  {
    title: "After-School and Weekend Programs",
    kicker: "Support and enrichment",
    detail:
      "Academic coaching during the week and enrichment classes at weekends help learners close gaps, strengthen confidence and give motivated students room to move further ahead.",
    icon: Clock3,
    highlights: ["Academic coaching", "Homework support", "Weekend enrichment", "Exam revision", "Skill development", "Coding classes"],
  },
] as const;

const clubGroups = [
  {
    title: "Academic and Technology",
    icon: Code2,
    items: [
      "Coding and Programming Club — Python, AI, web development and digital projects.",
      "STEM Club — hands-on Science, Technology, Engineering, Arts and Mathematics projects.",
      "Math-for-Fun Club — engaging games, puzzles and practical problem-solving.",
    ],
  },
  {
    title: "Arts and Culture",
    icon: Palette,
    items: [
      "Arts and Culture Club — drawing, painting, music, drama and cultural awareness.",
      "Drama and Performance Club — stage plays, skits, expression and public speaking.",
      "Music Club — choir, instrumental training, rhythm and music theory.",
    ],
  },
  {
    title: "Sports and Games",
    icon: Gamepad2,
    items: [
      "Outdoor Games Club — football, athletics and team sports.",
      "Indoor Games Club — chess, electronic Scrabble, Ludo, puzzles and ThinkFun games.",
      "Physical wellness activities that strengthen discipline, coordination and teamwork.",
    ],
  },
  {
    title: "Leadership and Entrepreneurship",
    icon: BriefcaseBusiness,
    items: [
      "Leadership Club — mentorship, student council and real-world responsibility projects.",
      "Entrepreneurial Club — hands-on business projects, enterprise thinking and financial literacy.",
      "Team challenges that develop communication, initiative and confident decision-making.",
    ],
  },
] as const;

const inclusiveSupports = [
  ["Individualised Learning Plans", "Clear, personalised goals based on each learner&apos;s strengths and identified needs."],
  ["Inclusive classrooms", "Differentiated teaching helps learners participate meaningfully in the same caring school community."],
  ["Counselling and guidance", "Thoughtful emotional, behavioural and academic support for learners and families."],
  ["Specialised skill support", "Targeted programmes in literacy, numeracy and practical life skills, delivered in partnership with parents."],
] as const;

export default function ProgramsPage() {
  return (
    <>
      <section className="programs-hero">
        <div className="marketing-shell programs-hero-grid">
          <div>
            <span className="section-kicker">Our Programs</span>
            <h1>A complete education, under one roof.</h1>
            <p>
              From strong academics and examination preparation to coding, arts, sports and leadership, Petra Academy
              programmes help every child grow with confidence, competence and purpose.
            </p>
            <div className="hero-actions">
              <Link className="button button-lg" href="/apply">Apply for admission <ArrowRight size={18} /></Link>
              <Link className="button button-secondary button-lg" href="/book-visit">Book a school visit</Link>
            </div>
            <div className="hero-proof">
              <span><CheckCircle2 size={18} /> Daycare to College</span>
              <span><CheckCircle2 size={18} /> Academic, practical and leadership development</span>
            </div>
          </div>

          <div className="programs-visual" aria-label="Petra Academy learning ecosystem">
            <div className="programs-visual-core">
              <span><School size={42} /></span>
              <strong>One Petra education</strong>
              <small>Academics · Skills · Character</small>
            </div>
            <div className="programs-orbit programs-orbit-one"><Code2 size={22} /><span>Coding</span></div>
            <div className="programs-orbit programs-orbit-two"><Palette size={22} /><span>Creativity</span></div>
            <div className="programs-orbit programs-orbit-three"><Trophy size={22} /><span>Excellence</span></div>
            <div className="programs-orbit programs-orbit-four"><UsersRound size={22} /><span>Leadership</span></div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell split-section">
          <div>
            <span className="section-kicker">What We Do</span>
            <h2>Learning that goes beyond textbooks.</h2>
          </div>
          <div>
            <p>
              Every Petra Academy school day is designed with intention. Our educators combine structured academic
              instruction with hands-on experiences in technology, arts, sports, leadership and entrepreneurship.
            </p>
            <p>
              A learner may be coding a first application at the Petra Tech Hub, rehearsing for a drama performance,
              investigating a real-world problem in STEM Club or building teamwork through sport. Each experience is
              connected to skills that matter in school, work and life.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {["Academic excellence", "Digital confidence", "Creative expression", "Leadership", "Wellbeing"].map((item) => (
                <span className="rounded-full border border-[#e7e3e3] bg-white px-4 py-2 text-sm font-black text-[#78080b]" key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">Core Programs</span>
            <h2>A complete learning journey from Daycare to College.</h2>
            <p>Each section provides age-appropriate challenge, care and clear progression into the next stage.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {schoolSections.map(({ title, note, detail, icon: Icon }) => (
              <article className="marketing-card p-7" key={title}>
                <span className="card-icon"><Icon size={27} /></span>
                <small className="mt-6 block font-black uppercase tracking-[0.12em] text-[#a50e12]">{note}</small>
                <h3 className="mt-2 font-[var(--font-merriweather)] text-2xl">{title}</h3>
                <p className="mt-4 leading-7 text-[#666b73]">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">The Petra Curriculum Experience</span>
            <h2>Academic foundations enriched with future-ready skills.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {curriculumFeatures.map(([title, detail, Icon]) => (
              <article className="marketing-card flex gap-5 p-7 sm:p-8" key={title}>
                <span className="card-icon shrink-0"><Icon size={26} /></span>
                <div>
                  <h3 className="font-[var(--font-merriweather)] text-2xl">{title}</h3>
                  <p className="mt-3 leading-7 text-[#666b73]">{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section programs-signature-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker section-kicker-light">Signature Programs</span>
            <h2>Focused pathways for examinations, technology and extended learning.</h2>
            <p>Support that meets learners where they are and helps them move confidently towards their goals.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {signaturePrograms.map(({ title, kicker, detail, icon: Icon, highlights }) => (
              <article className="program-signature-card" key={title}>
                <span className="program-signature-icon"><Icon size={29} /></span>
                <small>{kicker}</small>
                <h3>{title}</h3>
                <p>{detail}</p>
                <div>
                  {highlights.map((item) => <span key={item}>{item}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">Beyond the Classroom</span>
            <h2>Learning that does not stop at 4 PM.</h2>
            <p>
              Clubs and enrichment activities develop creativity, teamwork, leadership, confidence and physical
              wellness while helping learners discover interests and talents.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {clubGroups.map(({ title, icon: Icon, items }) => (
              <article className="marketing-card p-7 sm:p-8" key={title}>
                <div className="flex items-center gap-4">
                  <span className="card-icon shrink-0"><Icon size={26} /></span>
                  <h3 className="font-[var(--font-merriweather)] text-2xl">{title}</h3>
                </div>
                <ul className="mt-6 space-y-4">
                  {items.map((item) => (
                    <li className="flex gap-3 leading-7 text-[#666b73]" key={item}>
                      <CheckCircle2 className="mt-1 shrink-0 text-[#a50e12]" size={19} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell inclusive-program-grid">
          <div className="inclusive-program-visual" aria-hidden="true">
            <div className="inclusive-ring inclusive-ring-one" />
            <div className="inclusive-ring inclusive-ring-two" />
            <span><HeartHandshake size={48} /></span>
            <strong>Every child belongs</strong>
            <small>Known · Supported · Included</small>
          </div>
          <div>
            <span className="section-kicker">Inclusive Education</span>
            <h2 className="mt-3 font-[var(--font-merriweather)] text-[clamp(2.4rem,5vw,4rem)] leading-[1.06] tracking-[-0.04em]">Every child belongs here.</h2>
            <p className="mt-6 text-[1.05rem] leading-8 text-[#666b73]">
              Petra Academy is committed to ensuring that no learner is left behind. We identify individual learning
              needs early and provide thoughtful, personalised support within a caring and inclusive school community.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {inclusiveSupports.map(([title, detail]) => (
                <article className="rounded-2xl border border-[#e7e3e3] bg-white p-5" key={title}>
                  <ShieldCheck className="text-[#a50e12]" size={22} />
                  <strong className="mt-4 block">{title}</strong>
                  <p className="mt-2 text-sm leading-6 text-[#666b73]" dangerouslySetInnerHTML={{ __html: detail }} />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell visit-banner">
          <div>
            <span className="section-kicker">Next Step</span>
            <h2>Ready to give your child the Petra advantage?</h2>
            <p>Begin an application online or visit our Awka or Nnewi campus to discuss the right programme for your child.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="button button-lg" href="/apply">Apply for admission <ArrowRight size={18} /></Link>
            <Link className="button button-secondary button-lg" href="/book-visit"><School size={18} /> Book a visit</Link>
          </div>
        </div>
      </section>
    </>
  );
}
