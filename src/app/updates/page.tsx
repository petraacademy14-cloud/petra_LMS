import Link from "next/link";
import { subscribeNewsletter } from "@/app/actions/communications";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const importantNotices = [
  {
    title: "Resumption Notice — 14 September 2026",
    body:
      "Petra Academy resumes for the new academic session on Monday, 14 September 2026. We look forward to welcoming our learners back for another productive term of learning, growth and excellence across our Awka and Nnewi campuses. Parents and guardians are encouraged to ensure that students are fully prepared for resumption and arrive promptly.",
  },
  {
    title: "School Fees Reminder",
    body:
      "Parents and guardians are kindly reminded to ensure that all required school fees and related payments are settled promptly as the new term begins. Timely payment helps the school maintain smooth academic and administrative operations and ensures that learners can resume without avoidable delays. For clarification on fees or payment arrangements, please contact the appropriate Awka or Nnewi campus administration.",
  },
] as const;

export default async function UpdatesPage() {
  const school = await db.school.findUnique({ where: { slug: "petra-academy" } });
  const [stories, announcements] = school
    ? await Promise.all([
        db.publication.findMany({
          where: { schoolId: school.id, status: "PUBLISHED" },
          include: { campus: true, category: true },
          orderBy: { publishedAt: "desc" },
          take: 30,
        }),
        db.announcement.findMany({
          where: { schoolId: school.id, status: "PUBLISHED", parentFacing: true },
          include: { campus: true, classArm: { include: { classLevel: true } } },
          orderBy: { publishedAt: "desc" },
          take: 12,
        }),
      ])
    : [[], []];

  return (
    <main>
      <section className="bg-[#fff0f1] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Petra Academy</p>
          <h1 className="page-title max-w-3xl">News, events and achievements from Awka and Nnewi</h1>
          <p className="page-subtitle">Published school updates and parent announcements in one low-data public page.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8">
        <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Important notices</p>
              <h2 className="text-2xl font-black">Resumption and school fees</h2>
            </div>
            <span className="pill">September 2026</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {importantNotices.map((notice) => (
              <article key={notice.title} className="rounded-2xl bg-[#fff7f7] p-5">
                <h3 className="text-lg font-black text-[#b91118]">{notice.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5d6470]">{notice.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_20rem]">
        <section>
          <h2 className="text-xl font-black">Latest stories</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {stories.map((x) => (
              <Link href={`/updates/${x.slug}`} key={x.id} className="card p-5 transition hover:-translate-y-0.5">
                <div className="flex gap-2">
                  <span className="pill">{x.kind}</span>
                  {x.campus && <span className="pill">{x.campus.name}</span>}
                </div>
                <h3 className="mt-3 text-lg font-black">{x.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#68707d]">{x.excerpt}</p>
                <p className="mt-4 text-sm font-black text-[#b91118]">Read update →</p>
              </Link>
            ))}
            {!stories.length && <p className="empty-state card sm:col-span-2">Published stories will appear here.</p>}
          </div>
        </section>

        <aside>
          <section className="card p-5">
            <h2 className="font-black">Parent announcements</h2>
            <div className="mt-3 space-y-4">
              {importantNotices.map((x) => (
                <article key={x.title}>
                  <p className="font-black">{x.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#68707d]">{x.body}</p>
                </article>
              ))}
              {announcements.map((x) => (
                <article key={x.id}>
                  <p className="font-black">{x.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#68707d]">{x.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="card mt-4 p-5">
            <h2 className="font-black">School newsletter</h2>
            <p className="mt-1 text-sm text-[#68707d]">Join the subscriber list for future approved updates.</p>
            <form action={subscribeNewsletter} className="mt-3 grid gap-2">
              <input name="name" placeholder="Name (optional)" />
              <input name="email" type="email" placeholder="Email address" required />
              <button className="button" type="submit">Subscribe</button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
