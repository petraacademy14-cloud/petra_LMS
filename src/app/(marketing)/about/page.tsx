import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Eye,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  School,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Petra Academy",
  description:
    "Discover Petra Academy's story, Principal's Word, mission, vision, values, goals and commitment to raising excellent future-ready leaders.",
};

const coreValues = [
  ["Excellence", "We pursue high standards in learning, character, service and every part of school life.", GraduationCap],
  ["Integrity", "We nurture honesty, responsibility, respect and the courage to do what is right.", ShieldCheck],
  ["Innovation", "We encourage curiosity, creativity, practical discovery and confident use of technology.", Lightbulb],
  ["Leadership", "We prepare learners to communicate clearly, think critically and influence others positively.", Target],
  ["Community", "We build strong partnerships among learners, families, teachers and the wider society.", HeartHandshake],
] as const;

const goals = [
  [
    "Future-ready skills",
    "Equip learners with digital literacy, communication, collaboration, critical thinking and problem-solving skills for the 21st century.",
    BrainCircuit,
  ],
  [
    "Character and leadership",
    "Foster emotional intelligence, moral uprightness, personal responsibility and purposeful leadership.",
    ShieldCheck,
  ],
  [
    "Creative personal growth",
    "Provide a safe and stimulating environment that supports creativity, confidence, talent and individual development.",
    Sparkles,
  ],
  [
    "Global awareness",
    "Develop globally aware citizens who are prepared to demonstrate excellence in Nigeria and across the world.",
    Globe2,
  ],
] as const;

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="marketing-shell page-hero-grid">
          <div>
            <span className="section-kicker">About Petra Academy</span>
            <h1>Rooted in purpose. Growing confident leaders.</h1>
            <p>
              Petra Academy is a nurturing learning community where confident, morally grounded and brilliant young
              leaders are raised to thrive, serve and lead in a rapidly changing world.
            </p>
          </div>
          <Image
            className="page-hero-logo"
            src="/brand/petra-logo.webp"
            alt="Petra Academy official logo"
            width={320}
            height={320}
            priority
            unoptimized
          />
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell split-section">
          <div>
            <span className="section-kicker">The Petra experience</span>
            <h2>A world-class education designed for the whole child.</h2>
          </div>
          <div>
            <p>
              Our curriculum blends the British and Montessori systems with Nigerian learning standards, enriched by
              STEM, Robotics, Coding, Leadership training and meaningful co-curricular activities. This thoughtful
              combination gives every learner a well-rounded academic and practical education.
            </p>
            <p>
              At Petra Academy, we develop strong character, critical thinking, creativity and academic excellence.
              Learners are supported to understand deeply, communicate confidently, solve real problems and grow into
              responsible leaders.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="marketing-card flex items-start gap-4 p-5">
                <span className="card-icon shrink-0"><BookOpen size={24} /></span>
                <div><strong className="block font-bold">Strong academic foundations</strong><small className="mt-1 block leading-6 text-[#666b73]">Structured teaching, early literacy and purposeful assessment.</small></div>
              </div>
              <div className="marketing-card flex items-start gap-4 p-5">
                <span className="card-icon shrink-0"><BrainCircuit size={24} /></span>
                <div><strong className="block font-bold">Technology-enabled learning</strong><small className="mt-1 block leading-6 text-[#666b73]">Coding, Robotics and STEM from the formative years.</small></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint petra-students-section">
        <div className="marketing-shell petra-students-grid">
          <figure className="petra-editorial-photo">
            <Image
              src="/images/petra-students-group.webp"
              alt="Petra Academy students in their burgundy school uniforms"
              width={1535}
              height={1024}
              sizes="(max-width: 720px) 100vw, 58vw"
            />
          </figure>
          <div>
            <span className="section-kicker">Our Students</span>
            <h2>Confident learners. Responsible leaders. Prepared for the future.</h2>
            <p>
              Petra learners are encouraged to ask thoughtful questions, work well with others and take responsibility
              for their growth. Academic confidence, good character and practical ability develop side by side.
            </p>
            <Link className="inline-cta" href="/programs">Explore the Petra learning journey <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <article className="overflow-hidden rounded-[2rem] bg-[#78080b] text-white shadow-[0_30px_80px_rgba(90,8,11,0.18)]">
            <div className="grid items-stretch lg:grid-cols-[0.88fr_1.12fr]">
              <figure className="relative min-h-[470px] overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.18),transparent_42%),linear-gradient(145deg,#a01931,#4f0715)] sm:min-h-[620px] lg:min-h-[650px] lg:border-b-0 lg:border-r">
                <Image
                  src="/images/petra-principal-portrait.webp"
                  alt="Principal of Petra Academy"
                  fill
                  sizes="(max-width: 960px) 88vw, 40vw"
                  className="object-contain object-bottom"
                />
              </figure>
              <div className="flex flex-col justify-center p-8 text-[1rem] leading-8 text-[#f7e7e7] sm:p-12 lg:p-[clamp(3rem,5vw,4.5rem)]">
                <span className="section-kicker section-kicker-light">Principal&apos;s Word</span>
                <h2 className="mb-6 mt-3 font-[var(--font-merriweather)] text-4xl leading-tight text-white sm:text-5xl">Welcome to Petra Academy</h2>
                <div className="space-y-5">
                  <p>
                    Petra Academy is a leading co-educational school serving learners from Daycare and Playgroup through
                    Nursery, Primary and College across our Awka and Nnewi campuses in Anambra State.
                  </p>
                  <p>
                    We operate inclusive classrooms with differentiated learning, modern teaching methods and innovative
                    classroom technologies. Our learners build strong early reading skills from the age of four while
                    gaining practical exposure to Coding, Robotics and STEM education.
                  </p>
                  <p>
                    We groom confident young leaders who communicate fluently, think critically and excel academically.
                    Every learner is welcomed into a warm classroom atmosphere guided by caring, dedicated and highly
                    professional teachers.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">Our direction</span>
            <h2>Purpose that shapes every learning experience.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="marketing-card p-8 sm:p-10">
              <span className="card-icon"><Target size={27} /></span>
              <span className="section-kicker mt-7">Our Mission</span>
              <h3 className="mt-3 font-[var(--font-merriweather)] text-3xl leading-tight">Premium, technology-enabled and deeply human education.</h3>
              <p className="mt-5 leading-8 text-[#666b73]">
                To provide a premium, technology-enabled education that nurtures academic brilliance, moral strength,
                creativity and leadership through a blend of global curricula and holistic development.
              </p>
            </article>
            <article className="marketing-card p-8 sm:p-10">
              <span className="card-icon"><Eye size={27} /></span>
              <span className="section-kicker mt-7">Our Vision</span>
              <h3 className="mt-3 font-[var(--font-merriweather)] text-3xl leading-tight">Young leaders who stand out wherever they go.</h3>
              <p className="mt-5 leading-8 text-[#666b73]">
                To raise confident, morally sound and brilliant young leaders who stand out wherever they go.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <div className="section-heading compact-heading">
            <span className="section-kicker">Our Core Values</span>
            <h2>The principles that guide the Petra community.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {coreValues.map(([title, detail, Icon]) => (
              <article className="marketing-card p-6" key={title}>
                <span className="card-icon"><Icon size={24} /></span>
                <h3 className="mt-6 font-[var(--font-merriweather)] text-xl">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#666b73]">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">Our Goals</span>
            <h2>Preparing learners for excellence in school, life and leadership.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {goals.map(([title, detail, Icon], index) => (
              <article className="marketing-card flex gap-5 p-7 sm:p-8" key={title}>
                <span className="card-icon shrink-0"><Icon size={26} /></span>
                <div>
                  <small className="font-black tracking-[0.14em] text-[#a50e12]">GOAL {index + 1}</small>
                  <h3 className="mt-2 font-[var(--font-merriweather)] text-2xl">{title}</h3>
                  <p className="mt-3 leading-7 text-[#666b73]">{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative grid min-h-80 place-items-center overflow-hidden rounded-[2rem] border border-[#e7e3e3] bg-white shadow-[0_20px_60px_rgba(51,24,24,0.08)]">
            <div className="absolute size-64 rounded-full border-[42px] border-[#a50e12]/5" />
            <div className="relative text-center">
              <span className="mx-auto grid size-24 place-items-center rounded-[2rem] bg-[#fff4f4] text-[#a50e12]"><UsersRound size={43} /></span>
              <strong className="mt-6 block font-[var(--font-merriweather)] text-2xl">The Petra teaching team</strong>
              <small className="mt-2 block text-[#666b73]">Caring · Dedicated · Professional</small>
            </div>
          </div>
          <div>
            <span className="section-kicker">Our Teachers</span>
            <h2 className="mt-3 font-[var(--font-merriweather)] text-[clamp(2.3rem,5vw,3.8rem)] leading-[1.08] tracking-[-0.035em]">Teachers who know, support and inspire every learner.</h2>
            <p className="mt-6 text-[1.05rem] leading-8 text-[#666b73]">
              Our teachers combine professional competence with patience, care and high expectations. They create warm,
              inclusive classrooms where learners feel safe to ask questions, explore ideas, practise new skills and
              grow in confidence.
            </p>
            <p className="mt-4 text-[1.05rem] leading-8 text-[#666b73]">
              Through continuous development, collaboration and thoughtful use of technology, the Petra teaching team
