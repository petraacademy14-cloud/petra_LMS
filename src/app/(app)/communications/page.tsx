import type { Metadata } from "next";
import { createAnnouncement, createCategory, createPublication, createTemplate, generateDeliveryDraft, transitionAnnouncement, transitionPublication, uploadCommunicationMedia } from "@/app/actions/communications";
import { PageHeading } from "@/components/page-heading";
import type { ContentStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Communications" };
const transitions: Partial<Record<ContentStatus, ContentStatus>> = { DRAFT: "IN_REVIEW", IN_REVIEW: "APPROVED", APPROVED: "PUBLISHED", PUBLISHED: "ARCHIVED" };
const nextStatus = (status: ContentStatus) => transitions[status] ?? null;

export default async function CommunicationsPage() {
  const viewer = await requirePermission("communications.read");
  const scope = viewer.membership.role === "OWNER" ? {} : { campusId: viewer.membership.campusId ?? "__none__" };
  const [announcements, publications, templates, drafts, categories, campuses, classArms, subscriberCount] = await Promise.all([
    db.announcement.findMany({ where: { schoolId: viewer.membership.schoolId, ...scope }, include: { campus: true, classArm: { include: { classLevel: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.publication.findMany({ where: { schoolId: viewer.membership.schoolId, ...(viewer.membership.role === "OWNER" ? {} : { OR: [{ campusId: viewer.membership.campusId ?? "__none__" }, { campusId: null }] }) }, include: { campus: true, category: true, media: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.communicationTemplate.findMany({ where: { schoolId: viewer.membership.schoolId, isActive: true }, orderBy: { name: "asc" } }),
    db.communicationDeliveryDraft.findMany({ where: { schoolId: viewer.membership.schoolId }, include: { announcement: true }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.contentCategory.findMany({ where: { schoolId: viewer.membership.schoolId }, orderBy: { name: "asc" } }),
    db.campus.findMany({ where: { schoolId: viewer.membership.schoolId, isActive: true, ...(viewer.membership.role === "OWNER" ? {} : { id: viewer.membership.campusId ?? "__none__" }) }, orderBy: { name: "asc" } }),
    db.classArm.findMany({ where: { isActive: true, campus: { schoolId: viewer.membership.schoolId, ...(viewer.membership.role === "OWNER" ? {} : { id: viewer.membership.campusId ?? "__none__" }) } }, include: { campus: true, classLevel: true }, orderBy: [{ classLevel: { sortOrder: "asc" } }, { name: "asc" }] }),
    db.newsletterSubscriber.count({ where: { schoolId: viewer.membership.schoolId, isActive: true } }),
  ]);
  const canReview = hasPermission(viewer.membership.role, "communications.review");
  const canPublish = hasPermission(viewer.membership.role, "communications.publish");
  return <div>
    <PageHeading eyebrow="Phase 5" title="Communications & digital presence" description="Draft, review and publish parent announcements, school news, events and achievements. WhatsApp and email output remains a generated draft in V1." />
    <section className="mt-6 grid gap-4 sm:grid-cols-3">
      <article className="card p-5"><p className="eyebrow">Announcements</p><p className="mt-2 text-3xl font-black">{announcements.length}</p></article>
      <article className="card p-5"><p className="eyebrow">Public stories</p><p className="mt-2 text-3xl font-black">{publications.filter(x=>x.status==="PUBLISHED").length}</p></article>
      <article className="card p-5"><p className="eyebrow">Subscribers</p><p className="mt-2 text-3xl font-black">{subscriberCount}</p></article>
    </section>

    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <details className="card p-5" open><summary className="cursor-pointer font-black">Create announcement</summary>
        <form action={createAnnouncement} className="mt-4 grid gap-3">
          <input name="title" placeholder="Announcement title" required maxLength={160} />
          <textarea name="body" placeholder="Message to parents or staff" rows={5} required />
          <div className="grid gap-3 sm:grid-cols-2"><select name="audience" defaultValue="CAMPUS"><option value="SCHOOL">Whole school</option><option value="CAMPUS">Campus</option><option value="CLASS">Class</option></select><select name="campusId" defaultValue={viewer.membership.campusId ?? ""}><option value="">No campus / school-wide</option>{campuses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <select name="classArmId" defaultValue=""><option value="">No class</option>{classArms.map(a=><option key={a.id} value={a.id}>{a.campus.name} · {a.classLevel.name} {a.name}</option>)}</select>
          <input type="datetime-local" name="scheduledFor" /><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="parentFacing" defaultChecked /> Show to parents when published</label>
          <button className="button" type="submit">Save draft announcement</button>
        </form>
      </details>
      <details className="card p-5" open><summary className="cursor-pointer font-black">Create public story or event</summary>
        <form action={createPublication} className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2"><select name="kind"><option value="NEWS">News</option><option value="EVENT">Event</option><option value="ACHIEVEMENT">Student achievement</option></select><select name="campusId" defaultValue={viewer.membership.campusId ?? ""}><option value="">School-wide</option>{campuses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <input name="title" placeholder="Headline" required /><textarea name="excerpt" placeholder="Short summary" rows={2} required /><textarea name="body" placeholder="Full story" rows={6} required />
          <div className="grid gap-3 sm:grid-cols-2"><select name="categoryId" defaultValue=""><option value="">No category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input name="tags" placeholder="sports, awka, achievement" /></div>
          <input name="coverImageUrl" type="url" placeholder="Optional cover image URL" /><div className="grid gap-3 sm:grid-cols-2"><input type="datetime-local" name="eventStartsAt" /><input type="datetime-local" name="eventEndsAt" /></div>
          <button className="button" type="submit">Save draft publication</button>
        </form>
      </details>
    </div>

    {canReview && <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <details className="card p-5"><summary className="cursor-pointer font-black">Add message template</summary><form action={createTemplate} className="mt-4 grid gap-3"><input name="name" placeholder="Template name" required/><div className="grid gap-3 sm:grid-cols-2"><select name="kind"><option value="GENERAL">General</option><option value="FEE_REMINDER">Fee reminder</option><option value="RESULT_NOTICE">Result notice</option><option value="ATTENDANCE_NOTICE">Attendance notice</option></select><select name="channel"><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="PRINT">Print</option></select></div><input name="subject" placeholder="Email subject (optional)"/><textarea name="body" rows={4} placeholder="Use {{title}}, {{message}} and {{school}}" required/><button className="button" type="submit">Save template</button></form></details>
      <details className="card p-5"><summary className="cursor-pointer font-black">Add news category</summary><form action={createCategory} className="mt-4 flex gap-2"><input name="name" placeholder="e.g. School life" required/><button className="button" type="submit">Add category</button></form></details>
    </div>}

    <section className="card mt-5 overflow-hidden"><div className="border-b border-[#e5e7eb] p-5"><h2 className="font-black">Announcement workflow</h2></div><div className="divide-y divide-[#eceef1]">{announcements.map(item=>{const next=nextStatus(item.status); const allowed=next && (next==="IN_REVIEW" || (next==="APPROVED"&&canReview) || ((next==="PUBLISHED"||next==="ARCHIVED")&&canPublish)); return <article className="p-5" key={item.id}><div className="flex flex-wrap justify-between gap-3"><div><div className="flex gap-2"><span className="pill">{item.status}</span><span className="pill">{item.audience}</span></div><h3 className="mt-2 font-black">{item.title}</h3><p className="mt-1 max-w-3xl text-sm text-[#68707d]">{item.body}</p></div>{next&&allowed&&<form action={transitionAnnouncement.bind(null,item.id,next)}><button className="button-secondary button" type="submit">Move to {next.replace("_"," ").toLowerCase()}</button></form>}</div><form action={generateDeliveryDraft.bind(null,item.id)} className="mt-3 flex flex-wrap gap-2"><select name="channel"><option value="WHATSAPP">WhatsApp draft</option><option value="EMAIL">Email draft</option><option value="PRINT">Print draft</option></select><select name="templateId" defaultValue=""><option value="">No template</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name} · {t.channel}</option>)}</select><button className="button-secondary button" type="submit">Generate</button></form></article>})}{!announcements.length&&<p className="empty-state">No announcements yet.</p>}</div></section>

    <section className="card mt-5 overflow-hidden"><div className="border-b border-[#e5e7eb] p-5"><h2 className="font-black">News, events and achievements</h2></div><div className="divide-y divide-[#eceef1]">{publications.map(item=>{const next=nextStatus(item.status); const allowed=next && (next==="IN_REVIEW" || (next==="APPROVED"&&canReview) || ((next==="PUBLISHED"||next==="ARCHIVED")&&canPublish)); return <article className="p-5" key={item.id}><div className="flex flex-wrap justify-between gap-3"><div><div className="flex gap-2"><span className="pill">{item.status}</span><span className="pill">{item.kind}</span></div><h3 className="mt-2 font-black">{item.title}</h3><p className="mt-1 text-sm text-[#68707d]">{item.excerpt}</p></div>{next&&allowed&&<form action={transitionPublication.bind(null,item.id,next)}><button className="button-secondary button" type="submit">Move to {next.replace("_"," ").toLowerCase()}</button></form>}</div>{item.status==="DRAFT"&&<form action={uploadCommunicationMedia.bind(null,item.id)} className="mt-3 flex flex-wrap gap-2" encType="multipart/form-data"><input name="name" placeholder="Media label"/><input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required/><button className="button-secondary button" type="submit">Upload media</button></form>}{item.media.length>0&&<p className="mt-2 text-xs text-[#68707d]">{item.media.length} media file(s)</p>}</article>})}{!publications.length&&<p className="empty-state">No publications yet.</p>}</div></section>

    <section className="card mt-5 p-5"><h2 className="font-black">Generated delivery drafts</h2><div className="mt-3 grid gap-3">{drafts.map(d=><article key={d.id} className="rounded-xl border border-[#e5e7eb] p-4"><div className="flex gap-2"><span className="pill">{d.channel}</span><span className="pill">{d.recipientCount} recipients</span></div><p className="mt-2 font-bold">{d.announcement?.title ?? "Standalone message"}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[#68707d]">{d.content}</p></article>)}{!drafts.length&&<p className="text-sm text-[#68707d]">No delivery drafts generated.</p>}</div></section>
  </div>;
}
