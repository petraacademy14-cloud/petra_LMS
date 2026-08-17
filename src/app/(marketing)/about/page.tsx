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

      <section className="marketing-section">
        <div className="marketing-shell">
          <div className="section-heading">
            <span className="section-kicker">Our School Community</span>
            <h2>Learning, growing and celebrating together.</h2>
            <p>
              Petra Academy brings learners and educators together in a caring community where every child is known,
              supported and encouraged to become confident, responsible and future-ready.
            </p>
          </div>
          <figure className="overflow-hidden rounded-[2rem] border border-[#e7e3e3] bg-[#f7f3f1] shadow-[0_24px_70px_rgba(51,24,24,0.1)]">
            <Image
              className="block h-auto w-full"
              src="/images/petra-school-community.webp"
              alt="Petra Academy students and educators gathered together at the school"
              width={1536}
              height={1024}
              sizes="(max-width: 720px) 100vw, 1180px"
            />
            <figcaption className="border-t border-[#e7e3e3] bg-white px-6 py-5 text-center sm:px-8 sm:py-6">
              <strong className="block font-[var(--font-merriweather)] text-2xl text-[#211f20]">One Petra community</strong>
              <small className="mt-2 block font-semibold tracking-wide text-[#666b73]">Learners · Educators · Leaders</small>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="marketing-section section-tint">
        <div className="marketing-shell">
          <article className="overflow-hidden rounded-[2rem] bg-[#78080b] text-white shadow-[0_30px_80px_rgba(90,8,11,0.18)]">
            <div className="grid items-stretch lg:grid-cols-[0.8fr_1.2fr]">
              <figure className="relative min-h-[430px] overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.18),transparent_42%),linear-gradient(145deg,#a01931,#4f0715)] sm:min-h-[500px] lg:min-h-[520px] lg:border-b-0 lg:border-r">
                <Image
                  src="/images/petra-principal-portrait.webp"
                  alt="Principal of Petra Academy"
                  fill
                  sizes="(max-width: 960px) 88vw, 40vw"
                  className="object-contain object-bottom"
                />
              </figure>
              <div className="flex flex-col justify-center p-7 text-[1rem] leading-7 text-[#f7e7e7] sm:p-10 lg:p-[clamp(2.5rem,4vw,3.75rem)]">
                <span className="section-kicker section-kicker-light">Principal&apos;s Word</span>
                <h2 className="mb-4 mt-3 font-[var(--font-merriweather)] text-4xl leading-tight text-white sm:text-5xl">Welcome to Petra Academy</h2>
                <div className="space-y-4">
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
          <div className="overflow-hidden rounded-[2rem] border border-[#e7e3e3] bg-white shadow-[0_20px_60px_rgba(51,24,24,0.08)]">
            <div className="relative min-h-[18rem] overflow-hidden bg-[#241b1b] lg:min-h-[27rem]">
              <Image
                className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-2xl"
                src="/images/petra-staff-team.webp"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                aria-hidden="true"
              />
              <Image
                className="object-contain"
                src="/images/petra-staff-team.webp"
                alt="Petra Academy staff members gathered together outside the school building"
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
              />
            </div>
            <div className="px-6 py-5 text-center sm:px-8 sm:py-6">
              <strong className="block font-[var(--font-merriweather)] text-2xl text-[#211f20]">The Petra Nursery and Elementary teaching team</strong>
              <small className="mt-2 block font-semibold tracking-wide text-[#666b73]">Caring · Dedicated · Professional</small>
            </div>
          </div>
          <div>
            <span className="section-kicker">Nursery &amp; Elementary Teachers</span>
            <h2 className="mt-3 font-[var(--font-merriweather)] text-[clamp(2.3rem,5vw,3.8rem)] leading-[1.08] tracking-[-0.035em]">Teachers who know, support and inspire every learner.</h2>
            <p className="mt-6 text-[1.05rem] leading-8 text-[#666b73]">
              Our teachers combine professional competence with patience, care and high expectations. They create warm,
              inclusive classrooms where learners feel safe to ask questions, explore ideas, practise new skills and
              grow in confidence.
            </p>
            <p className="mt-4 text-[1.05rem] leading-8 text-[#666b73]">
              Through continuous development, collaboration and thoughtful use of technology, the Petra teaching team
              delivers engaging lessons while paying close attention to the progress and needs of each child.
            </p>
            <Link className="inline-cta mt-5" href="/book-visit">Meet our school community <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-shell">
          <article className="petra-campus-showcase">
            <Image
              className="petra-campus-showcase-image"
              src="/images/petra-campus-full.webp"
              alt="Petra Academy campus building and school vehicles"
              fill
              sizes="(max-width: 720px) 100vw, 1180px"
            />
            <div className="petra-campus-showcase-overlay">
              <span className="section-kicker section-kicker-light">Two Campuses. One Petra Standard.</span>
              <h2>Experience Petra Academy in Awka or Nnewi.</h2>
              <p>
                Visit our learning environment, meet the team and discover the right pathway from Daycare and
                Playgroup through Nursery, Primary and College.
              </p>
              <div className="petra-campus-showcase-actions">
                <Link className="button button-lg button-light" href="/book-visit">
                  Book a school visit <ArrowRight size={18} />
                </Link>
                <Link className="button button-lg button-ghost-light" href="/contact">
                  <School size={18} /> Contact us
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
